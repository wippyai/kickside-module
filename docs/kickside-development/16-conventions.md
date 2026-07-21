# Conventions

Composition, wiring, and the endpoint firewall key off the exact shapes
below - they are canon, not style. Backticked paths cite the Kickside
monorepo; every shape is shown complete, no checkout needed.

## Namespaces

Every module is a registry namespace tree. Each directory under `src/`
holds one `_index.yaml` opening with `version: "1.0"` and a `namespace:`
line; the namespace equals the directory path. `src/` is the module root
`kickside.<module>`, each subdirectory appends one dotted segment
(`platform/uploads/src/events/_index.yaml` → `kickside.uploads.events`),
and `core/` modules use the `kickside.core.*` prefix (`kickside.core.jobs`,
not `kickside.jobs`). Entry ids are `namespace:name` everywhere - yaml
references, Lua code, `app.deps` parameters, security resources:
`kickside.uploads.persist:upload_repo`, `app.security:user`.

The same slice vocabulary recurs module to module; a slice exists only when
the module has entries of that concern:

- **`.persist`** — repos, writers, projections, read models
- **`.api`** — HTTP handlers and endpoints
- **`.migrations`** — schema migrations
- **`.security`** — access policy + injected scope
- **`.events`** — thread event type definitions
- **`.binding`** — contract bindings
- **`.traits`** — agent-facing tools
- **`.sink`** — writable sink implementations
- **`.service`** — long-running workers
- **`.registry`** — registry read-models

Every module root declares exactly one `ns.definition` manifest:

```yaml
# platform/oauth/src/_index.yaml
- name: definition
  kind: ns.definition
  readme: file://README.md
  meta:
    title: Kickside OAuth
    comment: OAuth 2.0 connection management with PKCE support, token storage, and refresh.
```

## Dependencies And Wiring

Declare each component the module needs as a `ns.dependency`. The dominant
entry-name idiom is `dep.<vendor>.<module>`
(`platform/uploads/src/_index.yaml` has `- name: dep.kickside.core` with
`version: '>=0.1.17'`, `component: kickside/core`); older modules use
`__dependency.<vendor>.<module>`. The name is arbitrary - `kind` +
`component: <vendor>/<module>` + `version` are what matter.

`ns.requirement` entries are the module's configurable inputs and why it
stays app-agnostic: it declares "I need a db / router / storage / scope"
and the host supplies the value. Each names a `default:` and `targets:`
(entry + path) rewritten at compose time:

```yaml
# platform/uploads/src/_index.yaml
- name: database_resource
  kind: ns.requirement
  default: app:db
  targets:
    - entry: kickside.uploads.env:database_resource
      path: .default
    - entry: kickside.uploads.migrations:01_create_uploads_table
      path: .meta.target_db
```

Target path forms: `.default` (env.variable entries), `.meta.target_db`
(migrations), `.meta.router` (endpoints), `.meta.server`, and list-append
`".groups +="` / `".security.policies +="`.

The app fills requirements through `app.deps`: one `ns.dependency` per
installed component, each `parameters[].name` a requirement id:

```yaml
# app/src/app/deps/_index.yaml
- name: uploads
  kind: ns.dependency
  component: kickside/uploads
  parameters:
    - name: kickside.uploads:database_resource
      value: app:db
    - name: kickside.uploads:api_router
      value: app:api
    - name: kickside.uploads:storage_id
      value: app:uploads
    - name: kickside.uploads:process_host
      value: app:processes
    - name: kickside.uploads:ui_server
      value: app:gateway
    - name: kickside.uploads.security:user_security_scope
      value: app.security:user
```

Reuse the requirement tokens other modules already use:

- **`api_router`**
  - **Typical value:** `app:api`
  - **Injects:** authenticated router for `.api` endpoints
- **`public_api_router` / `public_router`**
  - **Typical value:** `app:api.public`
  - **Injects:** no-auth router for callbacks/login
- **`target_db` / `database_resource`**
  - **Typical value:** `app:db`
  - **Injects:** database for repos and migrations
- **`process_host`**
  - **Typical value:** `app:processes`
  - **Injects:** host for services and workers
- **`ui_server`**
  - **Typical value:** `app:gateway`
  - **Injects:** server for static/web-component assets
- **`env_storage`**
  - **Typical value:** `app.env:store`
  - **Injects:** env storage router
- **`user_security_scope`**
  - **Typical value:** `app.security:user`
  - **Injects:** group appended to the access policy

## Events

Thread event types live in a `<module>.events` slice as `registry.entry`
items of `meta.type: kickside.core.threads.event`. The entry id is the
event type - `kickside.uploads.events:upload.completed` appears verbatim as
the `type` on thread events - and each entry carries a JSON Schema payload:

```yaml
# platform/uploads/src/events/_index.yaml   (namespace: kickside.uploads.events)
- name: upload.completed
  kind: registry.entry
  meta:
    type: kickside.core.threads.event
  schema:
    $schema: https://json-schema.org/draft/2020-12/schema
    type: object
    properties:
      upload_id: { type: string }
```

The component binding lists the id under `events.output`
(`- type: kickside.uploads.events:upload.completed`), and an automation
port exposes it to automations - a `registry.entry` of
`meta.type: kickside.automation.port` with
`binding: kickside.uploads:uploads_component` and
`event: kickside.uploads.events:upload.completed`
(`platform/uploads/src/_index.yaml`). Internal/audit events no automation
consumes omit the port, not the schema.

## Security

Every module gates its endpoints with the same two-entry `security/` slice:
a `security.policy` `<module>_endpoint_access` with deliberately empty
`groups: []`, and a `user_security_scope` requirement that appends the
host's chosen group into it. Per-user ownership is enforced behind the
endpoints.

```yaml
# platform/models/src/security/_index.yaml
- name: models_endpoint_access
  kind: security.policy
  meta:
    comment: Authenticated users may reach the models product endpoints.
  groups: []
  policy:
    resources:
      - kickside.models.api:*
    actions: access
    effect: allow

- name: user_security_scope
  kind: ns.requirement
  meta:
    comment: Application security group that may reach the models endpoints.
  targets:
    - entry: kickside.models.security:models_endpoint_access
      path: ".groups +="
```

The app wires the group in `app.deps`
(`kickside.models.security:user_security_scope` → `app.security:user`).
List every handler-carrying namespace under `resources:` - uploads grants
`kickside.uploads.api:*` and `kickside.uploads:*` because raw/artifact
handlers live on its root namespace.

Enforcement is on the router: `token_auth` middleware resolves actor/scope
from the bearer token, then the `endpoint_firewall` post-middleware checks
the caller's groups against `access` grants on the endpoint's resource id.
The policy plus the injected group is all a module needs.

A sensitive `function.lua` can additionally run under its own actor with an
explicit policy allowlist:

```yaml
# platform/users/src/api/_index.yaml (login handler)
    security:
      actor:
        id: kickside.users.api:login
      policies:
        - app.security:login.db_access
        - app.security:login.env_read
        - app.security:login.auth_runtime
        - app.security:login.scope_runtime
        - app.security:login.token_runtime
        - app.security:login.settings_read
```

Each referenced policy is an app-owned `security.policy` with
`meta.type: app.security.policy_binding` and a tightly scoped
`resources:`/`actions:` list (`login.db_access` grants only `db.get` on
`app:db`). Module `security/` slices stay access-only; trusted-runtime
grants live in `app.security` (`app/src/app/security/_index.yaml`).

## Settings

An admin-editable, DB-backed setting is a `registry.entry` of
`meta.type: kickside.settings:definition`; the settings service stores only
admin overrides (declared `default:` is the base value) and serves reads
through the `kickside.settings:settings` contract.
`meta.type: kickside.settings:block` groups a module's settings into an
admin card; `meta.type: ui.settings_tab` adds a System-page tab. On all
three, every custom field (`namespace`, `key`, `value_type`, ...) is a
top-level key of the entry - only `type`/`comment` go under `meta:`, and a
misplaced field silently drops the entry. Full anatomy, blocks, tabs,
secrets, and the write path: [Settings](17-settings.md).

## Env

Two idioms; pick by audience.

**Idiom A - `env.variable` entries**, for values the host must wire or an
operator must see (db/storage/router ids, credentials). A `<module>.env`
slice binds a registry id to an env variable through `app.env:store`, with
a code `default:`; `private: true` marks sensitive vars:

```yaml
# platform/uploads/src/env/_index.yaml
- name: database_resource
  kind: env.variable
  meta:
    comment: Database resource for uploads storage
    icon: tabler:database
    private: true
  default: app:db
  storage: app.env:store
  variable: KICKSIDE_UPLOADS_DATABASE_RESOURCE
```

These entries are frequently `ns.requirement` targets (the requirement
rewrites `.default`), so one value is both env-overridable and app-wireable.

**Idiom B - code default with env override**, for internal engine tunables
the module owns end-to-end. Register no `env.variable` entries; read
`env.get(KEY) or DEFAULT` in a `config.lua`, making code the source of
truth and env purely optional. Document the keys in an `_index.yaml`
comment block instead of registering them:

```lua
-- core/jobs/src/config.lua
M.DB_ID = env.get("KICKSIDE_CORE_JOB_DB_ID") or "app:db"
M.LEASE_TIMEOUT_SECONDS = int_env("KICKSIDE_CORE_JOB_LEASE_TIMEOUT_SECONDS", 45)
```

On the app side (`app/src/app/env/_index.yaml`), `app.env:store` is an
`env.storage.router` over `app.env:file` (the `.env` file), `app.env:os`,
and `app.env:defaults` - an `env.storage.static` with declared defaults such
as `KICKSIDE_USERS_DATABASE_RESOURCE: app:db` so the app boots with no env
at all. First match wins, so real env always overrides the baked defaults.
Secrets are never baked into `defaults`.

## HTTP API

Each endpoint in a `<module>.api` slice is two entries: the handler
(`kind: function.lua`, `method: handler`) and a paired `kind:
http.endpoint` named `<handler>.endpoint`:

```yaml
# platform/oauth/src/api/_index.yaml
- name: discover_providers
  kind: function.lua
  meta:
    comment: Discovers available OAuth providers for connection
  source: file://discover_providers.lua
  modules: [http, contract, security]
  method: handler

- name: discover_providers.endpoint
  kind: http.endpoint
  meta:
    comment: Endpoint that discovers available OAuth providers
    router: app:api
  method: GET
  func: discover_providers
  path: /oauth/providers/discover
```

Path params use `{brace}` syntax: `/oauth/connections/{component_id}`.

`meta.router: app:api` is a default. The module root's `api_router`
requirement lists every shipped endpoint's `.meta.router` as a target so
the host can retarget them; modules with unauthenticated callbacks add a
second `public_api_router` requirement (`default: app:api.public`)
targeting the `api.public` endpoints:

```yaml
# platform/oauth/src/_index.yaml
- name: api_router
  kind: ns.requirement
  default: app:api
  targets:
    - entry: kickside.oauth.api:discover_providers.endpoint
      path: .meta.router
```

Endpoints declare relative paths (`/oauth/providers/discover`, `/user/me`);
the URL prefix and auth chain live on the router
(`app/src/app/_index.yaml`), so the oauth endpoint above resolves to
`/api/v1/oauth/providers/discover` and its callback to `/api/public/...`:

- **`app:api`**
  - **Prefix:** `/api/v1/`
  - **Auth:** `token_auth` + `endpoint_firewall`
  - **Use for:** authenticated product endpoints
- **`app:api.public`**
  - **Prefix:** `/api/public`
  - **Auth:** none
  - **Use for:** callbacks, login, webhooks
- **`app:api.views`**
  - **Prefix:** `/api/v1/views`
  - **Auth:** `token_auth` + `endpoint_firewall`
  - **Use for:** view/component data endpoints

## Quick Reference: Entry Kinds

- **`ns.definition`** — module manifest, one per module root
- **`ns.dependency`** — needs component `<vendor>/<module>` at `version`
- **`ns.requirement`** — configurable input: `default` + rewrite `targets`
- **`registry.entry`** — typed data: `kickside.settings:definition`, `kickside.settings:block`, `kickside.core.threads.event`, `kickside.automation.port`, `ui.nav_item`, `ui.settings_tab`, `view.component`, `kickside.security.role`, `upload.type`
- **`security.policy`** — access grants
- **`env.variable`, `env.storage.*`** — env binding and storage
- **`function.lua` + `http.endpoint`** — HTTP API pair
- **`library.lua`** — shared Lua code
- **`contract.definition` / `contract.binding`** — stable interfaces and their implementations
- **`http.router` / `http.service` / `http.static`** — app-side HTTP plumbing
- **`db.sql.sqlite`, `store.memory`, `fs.directory`, `process.host`** — app-side resources

Every reference to any of these, in yaml or Lua, is the `namespace:name` id.
