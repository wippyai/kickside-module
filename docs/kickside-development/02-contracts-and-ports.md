# Contracts And Ports

Contracts are the stable module boundary. A module that wants to be extended
defines a contract. A provider or feature module implements it with a binding.

Do not import another module's persistence code just to call a feature. Open its
contract or use its registry contract.

Backticked paths in this page cite the Kickside monorepo; the examples are
complete on their own.

Entry kinds and cross-module conventions live in
[Conventions](16-conventions.md).

Contract identity is `namespace:name`. Base contracts live in the dedicated
`kickside/contract` module, one namespace file per family: `kickside.contract:*`
in `core/contract/src/_index.yaml`, `kickside.data:*` (pullable/writable) in
`core/contract/src/data/_index.yaml`, `kickside.trigger:*` in
`core/contract/src/trigger/_index.yaml`. Product modules define their own
domain contracts in their own namespaces.

## Contract Definition

Define a contract when multiple implementations should be possible or when a
module should not know the concrete provider.

Examples:

- `kickside.connection:connection`
- `kickside.connection:reply_provider`
- `kickside.knowledge:kb_store_lifecycle`
- `kickside.knowledge:knowledge_bases`
- `kickside.contract:installable`
- `kickside.contract:deletable`
- `kickside.data:writable`
- `wippy.agent:resolver`

A definition is `meta` plus a `methods` array. Each method carries a
description and `input_schemas`/`output_schemas` as `application/schema+json`
strings. Minimal shape, verbatim from `core/contract/src/_index.yaml`
(`kickside.contract:deletable`):

```yaml
- name: deletable
  kind: contract.definition
  meta:
    comment: Optional contract for components that need custom deletion logic
    tags:
      - components
      - deletion
      - cleanup
  methods:
    - name: delete
      description: |
        Cleanup component resources only - service handles unregistering.
        Component should clean up files, connections, external resources, etc.
        Component service will unregister component after successful cleanup.
        Calling: delete(request_dto)
      input_schemas:
        - definition: |
            {
              "type": "object",
              "properties": {},
              "default": {}
            }
          format: application/schema+json
      output_schemas:
        - definition: |
            {
              "type": "object",
              "properties": {
                "success": {
                  "type": "boolean",
                  "description": "Whether deletion completed successfully"
                }
              },
              "required": ["success"]
            }
          format: application/schema+json
```

Method names are verbs. Include descriptions and schemas where the shape
matters. Larger
definitions with full JSON Schema bodies (for example `kickside.data:writable`)
follow the same shape in `core/contract/src/data/_index.yaml`.

## Contract Binding

A binding implements a contract for a concrete type. It is a thin map from
contract method to a `function.lua` entry ID; the function is the actual
implementation. From `platform/inbox/src/sink/_index.yaml`, where the inbox
module implements `kickside.data:writable`:

```yaml
- name: inbox_write
  kind: function.lua
  meta:
    comment: kickside.data:writable.write — post content to the ambient actor's inbox; delete removes the item keyed by the source identity.
  source: file://inbox_sink.lua
  method: write
  imports:
    inbox_writer: kickside.inbox.persist:inbox_writer
    inbox_types: kickside.inbox:inbox_types

- name: inbox_sink
  kind: contract.binding
  meta:
    title: Create Inbox Item
    icon: tabler:inbox
    comment: Create an item in the installer's inbox for review or follow-up.
    group: Human review
  contracts:
    - contract: kickside.data:writable
      methods:
        write: kickside.inbox.sink:inbox_write
```

The full method envelopes — argument and result schemas including error
shapes — live in the contract.definition's input/output schemas: for
`kickside.data:writable`, the write output's DataError constrains `scope` to
`item`, `flow`, `connection`, or `provider`, and the success branch must not
carry an `error` (`core/contract/src/data/_index.yaml`).

`contracts` is a list: one binding can implement several contracts, and
`default: true` on a contract entry marks the default implementation. From
`platform/oauth/src/binding/_index.yaml`:

```yaml
- name: provider_discovery_impl
  kind: contract.binding
  meta:
    comment: Default implementation of OAuth provider discovery contract
  contracts:
    - contract: kickside.oauth.discovery:provider_discovery
      default: true
      methods:
        get_component_contract: kickside.oauth.binding:get_component_contract_func
        get_connector_contract: kickside.oauth.binding:get_connector_contract_func
        get_provider_info: kickside.oauth.binding:get_provider_info_func
        list_available_providers: kickside.oauth.binding:list_available_providers_func
```

A module may bind a contract it does not own, including vendored `wippy.*`
contracts. `kickside/models` binds the vendor LLM seams in
`platform/models/src/_index.yaml`: a default `wippy.llm:model_resolver`
implementation, and a driver binding that implements four contracts —
`wippy.llm:generator`, `wippy.llm:embedder`, `wippy.llm:provider`, and
`wippy.llm:structured_output` — in one entry:

```yaml
- name: model_resolver
  kind: contract.binding
  meta:
    comment: App-level model resolver. Resolves DB-backed provider profiles/model overlays, then canonical registry model definitions.
  contracts:
    - contract: wippy.llm:model_resolver
      default: true
      methods:
        resolve: kickside.models:model_resolver_func

- name: openai_compat_plain.driver
  kind: contract.binding
  meta:
    comment: Plain-message OpenAI-compatible driver wrapper owned by kickside/models.
  contracts:
    - contract: wippy.llm:generator
      methods:
        generate: kickside.models:openai_compat_plain.generate
    - contract: wippy.llm:embedder
      methods:
        embed: wippy.llm.openai_compat:embed
    - contract: wippy.llm:provider
      methods:
        status: wippy.llm.openai_compat:status
    - contract: wippy.llm:structured_output
      methods:
        structured_output: wippy.llm.openai_compat:structured_output
```

Binding methods may point at functions in other namespaces, as the embedder
method above does: implementing a contract means owning the mapping, not
necessarily every function body.

Bindings may declare metadata used by discovery:

- `meta.actions` for allowed automation actions.
- `meta.reply` for static reply capabilities.
- `meta.component.create.view` for custom create UI.
- `meta.web_component` for picker/config UI.

Provider-specific config belongs in binding metadata or component private
context, not in the contract definition.

## Registry Entries

Use `registry.entry` for declarative discovery:

- **`ui.nav_item`** — App navigation surface
- **`view.component`** — Module-owned web component bundle
- **`kickside.kb_engine`** — KB engine descriptor
- **`kickside.automation.port`** — Published workflow port
- **`upload.type`** — Upload type and processing pipeline
- **`inbox.item_type`** — Inbox item renderer kind
- **`agent.trait`** — Agent trait
- **`tool`** — Agent or provider tool
- **`llm.model`** — Static model card

If adding a provider requires editing a central switch, the seam is probably in
the wrong place. Add a registry entry and binding instead.

## Ports

Automation ports are standalone discovery records. They let builders connect
sources and Destinations without knowing module internals. A
`registry.entry` with `meta.type: kickside.automation.port` carries a
`binding:` back-reference to the implementing binding. Do not place a second
port catalog in binding `meta.ports`. From
`platform/inbox/src/sink/_index.yaml` (schemas trimmed):

```yaml
- name: inbox_item
  kind: registry.entry
  meta:
    type: kickside.automation.port
    title: Create Inbox Item
    comment: Add an item to the inbox for review or follow-up.
    icon: tabler:inbox
  binding: kickside.inbox.sink:inbox_sink
  operations:
    upsert: {}
    delete:
      requires_dest_ref: false
  input_schema: |
    { "type": "object",
      "properties": {
        "content": { "type": "string", "description": "Item body." },
        "priority": { "type": "string", "enum": ["low", "normal", "high", "urgent"] }
      } }
  config_schema:
    item_type:
      picker: wc-schema-form
      type: string
      title: Item type
      default: notice
  output_schema: |
    { "type": "object",
      "properties": { "success": { "type": "boolean" } },
      "required": ["success"] }
```

The port record carries everything the builder UI needs: operations, the input
envelope schema, a schema-form config, and the output shape. Dispatch opens the
referenced binding's contract directly.

Use ports for:

- inbox sinks
- upload conversion sinks/sources
- automation trigger sources
- connection event sources
- KB ingest sinks

Do not add a custom dropdown catalog for one module if ports can describe it.

Block result routes also use the word Port, but live only in
`data.block.ports` and describe edges inside a Flow. See
[Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md).

## Actions

Actions are explicit public methods on a component type. Do not expose every
contract method. Declare the allowed action surface in metadata and route calls
through the component/action service so access and identity stay consistent.

Use actions for commands such as:

- pause/resume
- trigger now
- rotate credentials
- validate connection
- retry failed source

Use thread events for durable workflow facts and waits.

## Error Boundaries

Contract methods should return structured success/error values. Do not rely on
pcall at every call site to hide contract shape problems. Validate at the API or
contract boundary, then let tests catch missing methods or invalid bindings.

## When To Add A New Contract

Add one when:

- at least two implementations are expected, or
- the caller must not depend on the provider's storage, or
- the operation is a workflow port, or
- a product module owns policy and providers own mechanics.

Name it stable and product-neutral. Do not add one for a single private helper
that will never be implemented by another module. Use a library inside the
module.
