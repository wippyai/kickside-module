# Knowledge, Uploads, Automation, And Inbox

These modules are the main workflow-building blocks. They should compose through
components, contracts, ports, thread events, trace context, and public meta.

## Knowledge

`kickside.knowledge` is the KB control plane. It owns:

- KB component create/list/read/update/delete
- KB engine discovery
- the `kickside.knowledge:kb_store_lifecycle` engine store contract
- the `kickside.knowledge:knowledge_bases` registry contract
- ingestion/injection workers
- digest and graph enrichment coordination
- memory/tool traits
- the Knowledge web component surface

KB engines are independently published providers. An installation profile may
select KB10 as its default, but the control plane discovers installed engine
descriptors rather than importing provider source.

## KB Engine Descriptor

Add one `registry.entry` per engine. This trimmed document-engine declaration
shows the contract; inspect an installed engine through Hub `include_entries`
for its current ids and capabilities:

```yaml
- name: engine_document
  kind: registry.entry
  meta:
    type: kickside.kb_engine
    kb_type: document
    default: true
    title: Document
    icon: tabler:files
    impl_id: kickside.kb10:embeddable
    query_binding: kickside.kb10:queryable
    store_contract: kickside.knowledge:kb_store_lifecycle
    component:
      create: { view: kickside.kb10.ui:create_view }
      manage: { view: kickside.kb10.ui:document_view }
    projections:            # provisioned on the KB primary thread at create
      - kind: knowledge.injection.source
        worker_ref: "proc://kickside.kb10.injection:source_worker_proc"
        input_mode: prefetch_events
        events:
          input:
            - type: "kickside.knowledge.events:content.upserted"
            - type: "kickside.knowledge.events:content.deleted"
    default_config: { chunk_size: 1000, chunk_overlap: 150, ... }
```

`store_contract` names the engine's `kb_store_lifecycle` binding
(create/get/update/delete of the per-component store). There is no materializer
contract: source materialization is wired through the descriptor's declared
`projections` — the engine's own `worker_ref` workers. The control plane
resolves engines by descriptor. Do not branch centrally on engine names.

## Source Materialization

Public content writes go through the KB-owned durable thread. The engine's
declared source projection turns those events into engine storage:

```text
KB thread event -> declared source projection (engine worker_ref) -> kb10_*
```

Document, summary, chunk, and image source nodes are materialized from thread
events.

## KB Public Meta

KB public meta should represent the component-level render snapshot:

- `status`
- `last_error`
- `document_count`
- `chunk_count`
- `image_count`
- `concept_count`
- `last_ingested_at`
- `last_materialized_at`

The owner should be one KB component-state projection or one clearly-owned
component-state path. Domain helpers should not all recompute stats and call
`set_meta` independently.

## Uploads

`kickside.uploads` owns:

- upload API
- upload records
- core-job-backed processing targets
- upload tokens
- upload type registry
- processors
- original bytes
- derived artifacts
- preview endpoints
- upload web component surface

Upload types are `registry.entry` records with `meta.type = upload.type`.
Specific types outrank generic types by priority. Pure converters stay below
uploads; upload-specific artifact policy lives in uploads.

Use uploads as a conversion pipeline for workflows. If another module needs file
content, it should use the upload content/provider contract or a signed upload
token, not read upload storage directly.

## Upload Tokens

Use upload tokens when external or decoupled code needs safe access to an upload
without inheriting the caller's ambient session.

Use ambient component/API access when code is already inside the app under the
right actor and has the upload id.

Do not pack broad private context into upload tokens. Pack only what the receiver
must prove or route:

- upload id
- purpose
- expiry
- minimal trace context if needed
- callback/correlation key if needed

The upload row may keep user-facing origin metadata for UI, but token authority
is the signed token.

## Automation Engine And Kinds

`kickside.automation` is a generic engine; product kinds live in their own
modules. The engine never knows resource kinds and boots with zero registered
types (`platform/automation/src/_index.yaml`).

The engine owns:

- **Lifecycle** — install/control/uninstall, id-based rollback chains
- **Identity** — every automation instance is a component row
- **State** — public/private state plumbing over component meta/`private_context`
- **Actions** — dispatch through the `meta.actions` allowlist
- **Ports** — source/sink port discovery
- **Triggers** — the trigger service (spec-to-machine resolution) and the three shared modes `timer`/`watch`/`poll`
- **Timing** — delegated to `kickside.cron`

A kind module provides: a `contract.binding` with
`meta.type: kickside.automation` plus a thin Lua script implementing
`installable.install` and the kind's own control contract. Domain provisioning
happens inside the install body by calling domain contracts and recording
reversible steps.

Shipped kinds: Data Sync (`platform/sync`), Channel Responder
(`platform/channel/src/responder`), and one workflows kind. Every automation
instance is a `components` row (`impl_id` = the binding, `private_context` =
opaque install state including the `_rollback` chain, `class = automation`).
Status is read through the universal `kickside.contract:component:get_status`,
not an automation-specific hook.

Automation builders are product surfaces over declared ports and kind metadata.
They are not separate engines. A Data Sync diagram should render Source ->
transform -> Destination from declared ports while the engine uses events,
projections, trace, cron, and component identity underneath.

## Automation Kind Declaration

A new kind declares one binding. Data Sync is the flagship
(`platform/sync/src/_index.yaml`):

```yaml
- name: sync
  kind: contract.binding
  meta:
    type: kickside.automation        # <- this is what makes it a kind
    name: data_flow
    title: Data Sync
    icon: tabler:arrows-exchange
    category: data
    class: automation
    retention: { event_days: 30, drain_aware: true }
    component:
      create: { view: kickside.sync:sync_create_view }   # custom create UI web component
    actions:                          # <- the control allowlist (POST /{id}/actions/{method})
      - { name: status }
      - { name: poll }
      - { name: reconcile }
      - { name: pause }
      - { name: resume }
    trigger_handler: trigger_apply     # <- private method the trigger worker delivers to
    inputs: { ...JSON-schema install form... }         # validated at install
    public_state_schema: { fields: [...] }             # frontend-safe projected meta
    projections: [ { kind, worker_ref, input_mode } ]  # read-model workers
    events: { input: [...], output: [...] }            # thread-event ABI
  contracts:
    - contract: kickside.contract:component
      methods: { get_status: kickside.core.threads:thread_status }
    - contract: kickside.contract:installable
      methods: { install: kickside.sync:sync_install }
    - contract: kickside.sync:sync_contract        # the kind's own control contract
      methods: { status: ..., poll: kickside.automation:trigger_poll_tick, ... }
    - contract: kickside.contract:deletable
      methods: { delete: kickside.automation:noop_delete }
```

Declaration checklist:

1. `meta.type: kickside.automation` + `class: automation` — makes it a kind.
2. `meta.inputs` — a JSON Schema install form, validated at install. Sensitive
   fields use `type: password` / `format: password` / `sensitive: true`
   render hints.
3. `meta.component.create.view` (and optional `manage.view`) — a
   `view.component` web component the automation manager mounts, refreshing on
   the `automation-installed` event.
4. `meta.actions` — the control allowlist; only listed methods are
   dispatchable via `POST /{id}/actions/{method}`.
5. `meta.public_state_schema.fields` — the projected, frontend-safe meta.
   Install bootstrap and projection workers are the only writers.
6. `meta.projections` — read-model workers folding thread events into public
   meta.
7. `meta.events.input/output` — the engine-layer thread-event ABI.
8. `contracts` — four entries: `kickside.contract:installable` (`install`),
   `kickside.contract:component` (`get_status` ->
   `kickside.core.threads:thread_status`), `kickside.contract:deletable`
   (`delete`, defaults to `kickside.automation:noop_delete`), plus the kind's
   own control contract.

## Trigger Model

The trigger side is not authored per-kind. A kind embeds a trigger spec v1 in
its install input and delegates to `kickside.automation:trigger_service`. The
spec's `source` selects a published port; the resolver lowers the spec to one
of three modes, each a `contract.binding` on `kickside.trigger:mode`:

- **`timer`**
  - **Source:** none
  - **Behavior:** one cron row; the "On a schedule" family. The periodic source is a `registry.entry` of `meta.type: kickside.automation.trigger` with a `selector_schema` (interval/cron, UTC tz)
- **`watch`**
  - **Source:** events port
  - **Behavior:** projection over the source thread's events
- **`poll`**
  - **Source:** collection port
  - **Behavior:** cursor-walked pull of a `kickside.data:pullable` source; drain-then-tail, or drain-once on a `once` schedule

Install path: the kind's install body runs inside
`automations_lib.install(function(recorder) ... end)` and calls
`trigger_service.install({ spec = input.trigger, enabled, consumer =
{ component_id, handler_ref, ... }, recorder })`, embedding the returned
`_trigger` block into state (`platform/sync/src/sync.lua`).

Delivery path: the trigger service invokes the binding's
`meta.trigger_handler` (e.g. `trigger_apply`) with
`{ trigger_id, envelopes }` under the frozen installer identity. Data Sync's
handler applies the transform (`none|expr|llm|code`) and writes each item
through the sink's `kickside.data:writable` backing.

The shared "When"/"Destination" pickers are engine-owned web components:
`kickside-trigger-config` (props: `value` spec JSON, `allowed` CSV
`timer`/`source`, `source-classes` filter, `reconfigure`) and the workspace
"+" aggregate that funnels every kind through one Automation create surface.

## Automation Ports

Ports are `registry.entry` records with `meta.type:
kickside.automation.port`, in three shapes:

- **collection**
  - **Role:** source
  - **Backing:** `kickside.data:pullable`
  - **Consumed by:** poll mode
- **events**
  - **Role:** source
  - **Backing:** `event:` reference to a thread-event entry
  - **Consumed by:** watch mode
- **store**
  - **Role:** sink (Destination)
  - **Backing:** `kickside.data:writable`, declares `operations`
  - **Consumed by:** sync write path

A port binds to a connection via `config_schema`, using the shared connection
picker web component. A provider-specific source declares:

```yaml
config_schema:
  connection_id:
    picker: kickside-connection-trait-picker
    role: primary
    required: true
    connection_provider: github
    connection_label: GitHub connection
```

A sink for a different provider changes `connection_provider` and may omit
`role: primary` when no primary-resource semantics exist.

The engine passes the picker config as component context when opening the
backing: the pullable source opens with the connection as `component_id`
context, and the sink write call carries the config in both `req.config` and
the open context, so a binding with `context_required` reads them.

A kind may declare `meta.owned_resources` `{kind, state_key}` so a child
resource module can ask the automation layer to uninstall the owning umbrella
by `{resource_kind, resource_id}` without knowing private field names.

## Automation Gotchas

- A "run a body on a schedule or source event" capability is a Block or a
  declared automation kind, depending on whether it owns an installed
  lifecycle. Do not introduce a second execution engine.
- The `poll` control action maps to the shared engine function
  `kickside.automation:trigger_poll_tick`; the kind supplies only its
  `trigger_handler`. Do not re-implement paging in the kind.
- One-shot (`once`) schedules are legal for kinds in general but rejected for
  Data Sync — its input schema constrains `schedule.type` to
  `[interval, ticker, cron]` because a sync must keep moving data.
- Reconcile has hard port requirements: the source declares
  `reconcile.pull_keys`, the sink declares `list_keys` and a `delete`
  operation; otherwise install rejects reconcile. A sink that cannot map back
  to source keys declares `delete: { requires_dest_ref: true }` and omits
  `list_keys`; the engine then refuses key-only deletes rather than guessing.
- New public-state keys are specific (`run_state`, `connection_state`,
  `account_state`), not piled onto an overloaded `status`. Existing `status`
  fields stay until an explicit persisted-key migration.

## Inbox

Inbox is the human-in-the-loop seam.

It owns:

- item events
- inbox projection
- declarative item kinds
- public meta counts
- `/inbox` API
- `kickside.inbox.sink:inbox_sink`

Inbox item kinds are `registry.entry` records:

```yaml
meta:
  type: inbox.item_type
  value: ...
  name: ...
  icon: ...
  category: ...
  component_tag: ...
  component_base_path: ...
```

Workflow builders discover inbox through ports. Do not add a special inbox-only
catalog when ports can describe the sink.

## Canonical Flow Example

KB ingestion with human review:

1. User uploads files through uploads.
2. Upload processor writes artifacts.
3. KB ingest request event references upload/content by safe id/token.
4. The declared source projection writes KB source nodes.
5. Digest/enrichment emits durable events.
6. Inbox item asks for human approval.
7. User approves.
8. Workflow projection observes approval and continues.
9. KB component-state projection updates public meta.
10. Frontend receives `component.<kb_id>` and renders the new snapshot.
