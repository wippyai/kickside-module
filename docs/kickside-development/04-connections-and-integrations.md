# Connections And Integrations

Connections are component-backed provider resources. Provider modules implement
contracts; the platform connection module owns the registry and common policy.
Providers are standalone modules — a provider never edits the platform to
register itself.

## Connection Model

`kickside.connection` owns:

- the connection and reply-provider contract definitions
- the global registries (`kickside.connection:connections`,
  `kickside.connection:reply_providers`)
- the connection admin HTTP API
- shared helpers such as reply sending and attachment ingest

It owns no SQL tables. Connection state lives entirely in components:

- public meta: name, provider, state, display fields
- private context: credentials/config/resource selections
- access: component grants

## Platform Contracts

Defined in `platform/connection/src/_index.yaml`:

- **`kickside.connection:connection`**
  - **Methods:** `get_status`, `test_connection`, `discover_resources`
  - **Who implements:** provider
- **`kickside.connection:reply_provider`**
  - **Methods:** `send_reply`, `update_reply`, `send_status`
  - **Who implements:** provider (if it replies)
- **`kickside.connection:channel_context`**
  - **Methods:** `read_recent`
  - **Who implements:** provider (optional)
- **`kickside.connection:connections`**
  - **Methods:** register/find/upsert/update/delete/list/validate
  - **Who implements:** platform only
- **`kickside.connection:reply_providers`**
  - **Methods:** registry methods
  - **Who implements:** platform only

Providers never implement the registries; the platform binds them. Reversible
registry methods return a `rollback` step envelope
(`platform/connection/src/types.lua`).

## Provider Checklist

A provider connection is a `contract.binding`. The canonical rules
(`platform/connection/src/base_connection.lua` header):

- `meta.provider: <name>` — copied onto component meta at create time.
- `meta.class: [connection]` — add `reply_provider` when the provider replies.
- `meta.credential_schema` — the fields the Connect UI collects; also the
  server-side allowlist for `private_context`.
- Every contract entry carries `context_required: [component_id]`.
- The implementation imports `kickside.connection:base_connection` for
  `get_status`/`delete` boilerplate; `test_connection`/`discover_resources`
  resolve `component_id` from ambient context and open a transport handle.

## Minimal Provider Example

This is the canonical credential-only binding shape. For a specific provider,
inspect its current published entry through Hub `plan`/`list` with
`include_entries`; provider repositories are independent of this source tree.

```yaml
- name: github_connection
  kind: contract.binding
  meta:
    title: GitHub
    icon: tabler:brand-github
    provider: github
    group: Developer
    class:
      - connection
    credential_schema:            # the fields the Connect UI collects
      version: "1.0"
      submit_label: Connect
      fields:
        - key: token
          label: Personal access token
          type: password           # render hint -> masked field
          required: true
          placeholder: github_pat_...
  contracts:
    - contract: kickside.contract:component
      methods: { get_status: kickside.github.connection:get_status }
    - contract: kickside.connection:connection
      context_required: [component_id]
      methods:
        get_status: kickside.github.connection:get_status
        test_connection: kickside.github.connection:test_connection
        discover_resources: kickside.github.connection:discover_resources
    - contract: kickside.contract:deletable
      context_required: [component_id]
      methods: { delete: kickside.github.connection:delete }
```

The implementation is a thin adapter: `get_status`/`delete` delegate to the
base library; the transport does the provider-specific work.

## Credential Handling

- Credentials go into component `private_context`, nowhere else. The create
  handler takes `body.private_context` and registers
  `{ impl_id, private_context, meta }`. A connection stores only its
  credentials — it is shared transport and owns no execution identity
  (`platform/connection/src/api/create_connection.lua`).
- `credential_schema` is validated on create. The create policy rejects any
  `private_context` key not declared in `credential_schema.fields`, and
  enforces `required`, type, `select` options, and `required_if`. The schema
  is both the UI form spec and the server-side allowlist
  (`platform/connection/src/api/create_policy.lua`).
- Providers read credentials through the actor-validated component service,
  normally `component.get_private_context(component_id)`. There is no registry
  or raw-SQL fallback for credential lookup.
- Optional live validation: when `body.validate` is true, create opens the new
  component with write access and calls `test_connection`; failure deletes the
  component.

### Connection State Vocabulary

`connection_state` stores exactly one of the stored values; the rest are
read-time projections and are never persisted
(`platform/connection/src/types.lua`):

- **`connected`** — yes
- **`needs_reauth`** — yes
- **`disabled`** — yes
- **`expired`** — projection only
- **`error`** — projection only

## Resource Discovery

Provider resources returned by `discover_resources` are normalized:

```lua
{
  id = "...",
  label = "...",
  icon = "...",
  parent_id = "...",
  selectable = true,
  drillable = false,
}
```

## Reply Providers

Reply providers send output through external credentials. The replying actor
and the credential owner are not the same concept:

- credential/component owner controls the provider connection
- automation/agent installer controls the executed logic
- reply provider uses the connection's private credentials to send

Preserve both semantics. Do not collapse execution actor into credential owner.

A replying provider adds `reply_provider` to `meta.class` and declares static
reply capabilities in `meta.reply`. These are read from the registry by the
shared `reply_sender`; there is no `get_capabilities` method. A replying
provider declares this shape:

```yaml
class:
  - connection
  - reply_provider
reply:
  max_length: 2000
  content_types: [text/plain, text/markdown]
  attachments: false
  embeds: false
```

plus the contract binding:

```yaml
- contract: kickside.connection:reply_provider
  context_required: [component_id]
  methods:
    send_reply: kickside.discord.connection:send_reply
    update_reply: kickside.discord.connection:update_reply
    send_status: kickside.discord.connection:send_status
```

## OAuth

OAuth is a separate layer (`kickside.oauth`). A connection may reference
OAuth-derived credentials in private context, but it must not own the OAuth
protocol. `kickside.oauth` owns:

- encrypted token storage (its own `kickside_oauth_connections` table + migration)
- the public callback endpoints
- a background token-refresh process

### Connector Contracts

- **`kickside.oauth:connector`** — `init_oauth`, `handle_callback`, `refresh_token`
- **`kickside.oauth:base_connector`** — generic PKCE implementation; most providers reuse it and supply only endpoints/scopes
- **`kickside.oauth:oauth_connection`** — connection binding with `class: [connection, oauth_connection]`; implements `get_access_token`, `get_info`, `deletable`, `component:get_status`

An OAuth connection is itself a connection component, so it appears in the
same Connections registry.

### Adding An OAuth Provider Is One Registry Entry

The provider declares one `registry.entry` with `meta.oauth_provider`,
discovered by the OAuth registry. The following is the complete declaration
shape; use Hub discovery for a provider's current endpoints and scopes:

```yaml
- name: google
  kind: registry.entry
  meta:
    type: component
    title: Google
    class: [connection, oauth_connection, google_services, productivity]
    oauth_provider: google
  component_contract_id: kickside.oauth:oauth_connection
  connector_contract:
    implementation_id: kickside.oauth:base_connector
    context_values:
      oauth_authorization_endpoint: https://accounts.google.com/o/oauth2/v2/auth
      oauth_token_endpoint: https://oauth2.googleapis.com/token
      oauth_userinfo_endpoint: https://www.googleapis.com/oauth2/v2/userinfo
      oauth_client_id_setting: kickside.google:client_id
      oauth_client_secret_setting: kickside.google:client_secret
      oauth_extra_auth_params: { access_type: offline, prompt: consent }
  default_scopes: [openid, .../userinfo.profile, .../userinfo.email]
  available_scopes: [ ... ]
```

Client id/secret resolve from encrypted settings first, environment second.
The provider declares `kickside.settings:definition` secrets for both; the
OAuth `creds` library prefers settings over env.

### Multiple Credential Modes

If one provider supports OAuth and a direct token, model the modes explicitly
through the contracts implemented by the selected connection component. Open
the selected component through its declared contract and read only that mode's
private context. Do not probe one path and silently fall back to another;
selection and validation must be deterministic.

## Inbound Providers

Inbound providers normalize external events and route them into Kickside:

- channel messages
- DMs
- webhook events
- source sync events
- provider notifications

The transport process stays thin. It normalizes the event, resolves the
configured route, and writes to the canonical thread/port/contract. Business
logic belongs in automations, agents, projections, or the owning module.

## Discord / Channel / DM Shape

Discord is a provider. Channel/DM concepts are not a second application engine.

Canonical split:

- Discord gateway: transport and provider protocol
- Connection component: credentials and provider resources
- Channel/DM runtime: normalized conversation/session routing
- Automation/agent: responder logic, running under its installer actor
- Reply provider: sends via Discord credentials
- Thread: durable conversation/event history

A shared/admin-owned connection can host per-user responders. The router may
run as connection owner/system, but each responder must execute as its own
frozen installer identity.

## Source Syncs

Source sync belongs to the component/automation that owns the source. Store
watermarks in the owning private state, and emit durable events into threads.
Do not add source-specific columns to core event tables unless the query is
actually generic.

## Provider UI

Provider modules can ship web components:

- create/config panels
- resource pickers
- onboarding panels
- detail surfaces

Register them as `view.component` and mount them through module registry/nav
metadata. The app shell never imports provider UI directly. Create/manage
panels and the connection picker are self-served static bundles.

## Gotchas

- `get_status` is a component read-model, not a live health probe. It reads
  projected public meta only. For live credential/connectivity checks call
  `test_connection` (per binding) or the registry `validate` method (requires
  write access).
- `credential_schema` is a strict allowlist, not just a form. Create rejects
  any undeclared `private_context` key. A transport field you forgot to
  declare fails create with "private_context contains undeclared field".
- `context_required: [component_id]` is mandatory on every provider contract
  entry. A missing id is a wiring error, not a runtime condition; forgetting
  it makes `component_id()` fail with "component_id not in scope".
- Reply capabilities are static meta, not a contract method. Omitting
  `meta.reply` means the reply chunker has no length cap to honor.
- The connection module owns no watermarks or source config. Durable source
  configuration belongs to automation `private_context`; timing to cron. The
  poll trigger keeps its cursor in the engine-reserved `_trigger` block, not
  in the connection.
