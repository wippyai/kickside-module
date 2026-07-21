# Settings

Admin-editable, DB-backed settings are registry entries discovered by the
settings module (`platform/settings`). Three registry surfaces compose the
whole system:

- **`kickside.settings:definition`**
  - **Declares:** one typed value
  - **Rendered as:** a field in the generic form
- **`kickside.settings:block`**
  - **Declares:** a Settings-page left-nav entry
  - **Rendered as:** generic form or bespoke editor
- **`ui.settings_tab`**
  - **Declares:** a System-page tab
  - **Rendered as:** a whole page (web component/link)

Modules author settings by dropping entries into their own `_index.yaml`.
There is no central list to edit. Reads and writes go through the
`kickside.settings:settings` contract; the DB stores admin overrides only.

Key monorepo sources: `platform/settings/src/defs.lua` (discovery,
coercion), `types.lua`, `settings.lua` (contract methods, gating),
`persist/writer.lua` (the single write path), `blocks.lua`,
`_index.yaml` (contract, tab, view components).

## Definition Entries

Rule: every custom field is a **top-level key of the registry entry**, not
under `meta:`. Only `type: kickside.settings:definition` (and an optional
`comment`) belong under `meta:`. The reader (`platform/settings/src/defs.lua`)
reads fields off `entry.data`; a definition whose `namespace`/`key` sit
under `meta:` fails the string guard and is **silently dropped** - the
setting never appears anywhere and no error surfaces.

- **`namespace`**
  - **Read as:** required string; entry skipped if missing
  - **Effect:** grouping; DB PK half
- **`key`**
  - **Read as:** required string; entry skipped if missing
  - **Effect:** setting name; other PK half
- **`value_type`**
  - **Read as:** must be in `TYPES`, else entry skipped
  - **Effect:** see vocabulary below
- **`default`**
  - **Read as:** raw, any type
  - **Effect:** returned by `get` when no override row exists
- **`description`**
  - **Read as:** string, defaults `""`
  - **Effect:** shown under the field
- **`scope`**
  - **Read as:** string, defaults `"global"`
  - **Effect:** informational only (see Scope)
- **`editable`**
  - **Read as:** `~= false` (default true)
  - **Effect:** false blocks writes; still listed
- **`visible`**
  - **Read as:** `~= false` (default true)
  - **Effect:** false hides from UI; still writable
- **`schema`**
  - **Read as:** opaque passthrough
  - **Effect:** UI control + client-side validation hint
- **`validate_func`**
  - **Read as:** `ns:name` string or nil
  - **Effect:** server-side on-write validator
- **`title`**
  - **Read as:** non-empty string or nil
  - **Effect:** label (else humanized key)
- **`category`**
  - **Read as:** non-empty string or nil
  - **Effect:** subgroup heading within the form
- **`order`**
  - **Read as:** `tonumber`
  - **Effect:** sort weight within the category
- **`ui`**
  - **Read as:** non-empty string or nil
  - **Effect:** per-setting web-component tag

A fully-featured definition with a `schema` hint
(`platform/uploads/src/rasterize/_index.yaml`):

```yaml
- name: setting.rasterize_format
  kind: registry.entry
  meta:
    type: kickside.settings:definition
    comment: Output image format for rendered pages (jpeg keeps files small for OCR; png is lossless).
  namespace: kickside.uploads.rasterize
  key: rasterize_format
  value_type: string
  default: "jpeg"
  title: Image format
  category: Rasterization
  order: 20
  description: Image format for rendered pages - jpeg (small, recommended for OCR/caption), png (lossless), or webp.
  scope: global
  editable: true
  visible: true
  schema:
    type: string
    enum: [jpeg, png, webp]
```

A `duration` definition (`platform/users/src/_index.yaml`):

```yaml
- name: setting.token_expiration
  kind: registry.entry
  meta:
    type: kickside.settings:definition
    comment: Session lifetime, overriding KICKSIDE_USERS_TOKEN_EXPIRATION at token-mint time.
  namespace: kickside.users
  key: token_expiration
  value_type: duration
  default: 24h
  title: Session lifetime
  category: Authentication
  order: 10
  description: "How long a login session stays valid (a duration, e.g. `24h` or `720h`). Overrides KICKSIDE_USERS_TOKEN_EXPIRATION when set."
  scope: global
  editable: true
  visible: true
```

## Value Types And Coercion

`TYPES` (`platform/settings/src/types.lua`) is a closed set: `string`,
`int`, `bool`, `duration`, `json`, `secret`. A `value_type` outside the set
silently drops the whole definition. `defs.coerce` canonicalizes on every
read and write:

- `string`/`secret` - must be a Lua string
- `int` - `tonumber`, rejected unless whole, then `math.floor`; `"5"` in a
  string fails
- `bool` - must be a real boolean, not `"true"`
- `duration` - a string `time.parse_duration` accepts (`24h`); stored as
  the original string
- `json` - must be a table (object or array)
- `secret` - a string, AES-encrypted at rest (see Secrets)

## visible And editable

Orthogonal flags; choose deliberately.

`visible: false` is **hidden but writable**. Its only enforcement is
exclusion from `list` (`platform/settings/src/settings.lua`), so the admin
UI never renders it and a namespace with only invisible settings gets no
auto-block. `get`, `get_namespace`, `set`, `unset` ignore it entirely.
Real modules use it for settings driven by their own bespoke panel: all
SSO settings (`sso/src/_index.yaml`) and all nav/branding settings
(`platform/ui/src/_index.yaml`) are `visible: false`.

`editable: false` is **shown but read-only**. The writer rejects the write
(`platform/settings/src/persist/writer.lua`: `"setting is not editable"`),
and since `set`/`unset` are the only mutation path, the setting cannot be
overridden through contract or API. It still appears in `list` and `get`;
the form renders a static value. No shipping module currently declares it.

## Blocks

A block is one entry in the Settings page's left-nav. It does not enumerate
definitions: it **claims namespaces**, and the rendering form pulls every
visible definition in each namespace; grouping within a namespace comes
from the definitions' own `category` + `order`. Like definitions, all block
fields are top-level on the entry (`platform/settings/src/blocks.lua`).

- **`key`**
  - **Type:** string, required (entry dropped if empty)
  - **Meaning:** stable id + deep-link key
- **`title`**
  - **Type:** string, defaults to `key`
  - **Meaning:** nav label / pane heading
- **`icon`**
  - **Type:** string?
  - **Meaning:** tabler icon; falls back to `tabler:adjustments`
- **`order`**
  - **Type:** number?, default 100
  - **Meaning:** sort weight within its group
- **`group`**
  - **Type:** string?
  - **Meaning:** sidebar section; ungrouped blocks sort last
- **`component_tag`**
  - **Type:** string?
  - **Meaning:** mount this web component instead of the form
- **`namespace`**
  - **Type:** string?
  - **Meaning:** namespace the generic form edits and this block claims
- **`namespaces`**
  - **Type:** {string}?
  - **Meaning:** extra namespaces a bespoke block claims
- **`config`**
  - **Type:** table?
  - **Meaning:** opaque JSON handed to the `component_tag` editor

Auto-block synthesis: every namespace with at least one visible definition
and no explicit claim gets a synthesized block
`{ key = ns, title = humanize(ns), namespace = ns }`, so no visible
namespace is unreachable. An explicit block always wins over the auto-block
for its namespace. `humanize` strips a leading `kickside.` and title-cases
tokens (`kickside.uploads.documents` → `Uploads Documents`). Sort order is
`(group, order, title)` with ungrouped blocks trailing.

Three real patterns:

**Bespoke editor spanning several namespaces**
(`platform/uploads/src/_index.yaml`) - mounts its own component and lists
every covered namespace so none also gets an auto-block; the
`documents`/`rasterize` submodules declare no block of their own:

```yaml
- name: settings.block.storage
  kind: registry.entry
  meta:
    type: kickside.settings:block
    comment: Consolidated settings block for file storage, uploads, documents, and rasterization.
  key: storage
  title: Files & Uploads
  icon: tabler:files
  group: Content
  order: 60
  component_tag: kickside-settings-storage
  namespaces:
    - kickside.uploads
    - kickside.uploads.documents
    - kickside.uploads.rasterize
  config:
    namespaces:
      - kickside.uploads
      - kickside.uploads.documents
      - kickside.uploads.rasterize
```

**Shared provider card** (`platform/users/src/_index.yaml`) - the generic
form with nicer chrome, zero frontend code: reuse the settings module's own
`kickside-settings-provider` component and pass
`{ namespace, title, icon, help }`:

```yaml
- name: block.authentication
  kind: registry.entry
  meta:
    type: kickside.settings:block
    comment: Authentication - session and login token policy.
  key: authentication
  title: Authentication
  icon: tabler:lock
  group: Security
  order: 20
  component_tag: kickside-settings-provider
  namespace: kickside.users
  config:
    namespace: kickside.users
    title: Authentication
    icon: tabler:lock
    help: Session and login token policy.
```

**Several blocks, one editor** (`sso/src/_index.yaml`) - the SSO module
declares `component_tag: kickside-sso-admin` with
`config: { scope: global }` in group `Single sign-on`, and each provider
submodule declares its own block in the same group: one component, many
configs.

A block's `component_tag` must resolve to a registered `view.component`
`tag_name` or the block is unrenderable.

## Tabs

The System page (`app/frontend/applications/main/src/pages/system.vue`) is
purely declarative: it calls `GET /api/v1/settings/tabs` and renders what
comes back. The endpoint is owned by the shell module
(`platform/ui/src/api/list_settings_tabs.lua`), which discovers
`ui.settings_tab` entries and sorts by `order`. Three independent
registries assemble the page: tabs → the tab strip; the settings module's
own tab mounts `kickside-settings`, which fetches blocks → the left-nav;
each block's namespace → the fields.

Tab fields (top-level on the entry): `key` (required), `label` (defaults to
`key`), `icon` (default `tabler:square`), `order` (default 100), `render` ∈
{`component`, `link`, else `surface`}, plus `component_tag`, `url`,
`surface`. Malformed tabs are dropped: a `component` tab needs a
`component_tag`, a `link` tab needs a `url`.

The settings module's own tab (`platform/settings/src/_index.yaml`):

```yaml
- name: tab.settings
  kind: registry.entry
  meta:
    type: ui.settings_tab
    comment: Editable application settings (kickside/settings web component).
  key: settings
  label: Settings
  icon: tabler:adjustments
  order: 50
  render: component
  component_tag: kickside-settings
```

A `render: link` tab points at an external admin UI instead of mounting a
component: `platform/hub/src/_index.yaml` declares `tab.keeper` with
`render: link` and `url: /c/keeper:main/`. Other real tabs each mount one
web component: `kickside-users`, `kickside-security`, `kickside-webhooks`,
`kickside-appearance`, `kickside-models`, `kickside-hub`.

**Tab vs block.** Use a block (definitions + optional block entry) when the
settings are a handful of typed values that fit the generic form - typed
controls, category grouping, provenance, and reset-to-default come free,
with zero frontend code. Use a tab (`ui.settings_tab` + your own web
component) when the admin surface is a full bespoke app - CRUD lists,
wizards, custom widgets. Tab-owning modules usually declare no
definitions at all; when they do (SSO, appearance) they mark them
`visible: false` and drive them from their own panel. The two compose: the
Settings tab is itself just one `ui.settings_tab`.

## Custom Settings Components

The bundle owner and the `view.component` entry owner can differ. The
settings module builds and serves `kickside-settings-storage`
(`platform/settings/ui`, served at `/kickside-settings`), but the
`view.component` entry is owned by uploads - the module that uses it
(`platform/uploads/src/_index.yaml`):

```yaml
- name: settings_storage_view
  kind: registry.entry
  meta:
    type: view.component
    name: settings_storage_view
    title: Files & Uploads Settings
    announced: true
    tag_name: kickside-settings-storage
    base_path: kickside-settings
    entry_point: storage.js
    auto_register: false
    secure: false
```

`base_path`/`entry_point` point at whoever serves the bundle.
`auto_register: false` is correct here: nothing needs the element until the
block is opened, and the Settings page's `WcMount` registers the tag just
in time via `loadByTagName` (resolves the `view.component` by `tag_name`,
fetches the module, defines the element), then passes the block's `config`
as a JSON attribute and relays `config-changed` as `change`.

A single definition may also carry `ui: <tag>`: the generic form mounts
that tag for just that one field, handing it a config slice. The plumbing
is complete; no shipping definition uses it yet.

## The Settings Contract

`kickside.settings:settings` (`platform/settings/src/_index.yaml`) has five
methods:

- `get({ namespace, key }) -> { success, value }` - coerced override, else
  the declared `default`
- `get_namespace({ namespace }) -> { success, values }` - key → effective
  value for a namespace
- `set({ namespace, key, value }) -> { success }` - delegates to the writer
- `unset({ namespace, key }) -> { success }` - deletes the override,
  reverting to default
- `list({ namespace? }) -> { success, settings[] }` - declarations merged
  with overrides + provenance

`get`/`get_namespace` run under the service's own `kickside.settings:reader`
identity, so any caller allowed to open the contract can read. The
canonical read pattern (`platform/oauth/src/creds.lua`, which prefers an
encrypted setting over env for OAuth client credentials):

```lua
local def = contract.get(contract_id)
local inst = def:with_actor(actor):with_scope(scope):open()
local r = inst:get({ namespace = ns, key = key })
if r and r.success and type(r.value) == "string" and r.value ~= "" then
    return r.value
end
```

Writes are admin-gated in two layers:

1. App-owned endpoint firewall: `app.security:user` has no
   `kickside.settings.api:*` access; `app.security:admin` does. Handlers do
   no in-code permission checks.
2. The contract repeats the boundary so direct calls cannot bypass the
   firewall: `set`/`unset` require an authenticated actor with `access` to
   `kickside.settings.api:put_settings.endpoint`, `list` requires
   `kickside.settings.api:list_settings.endpoint`. Non-admin callers get
   exactly `"admin settings write access is required"` (set/unset) and
   `"admin settings list access is required"` (list). The writer also
   requires a non-empty `actor_id` for the audit `updated_by`.

## The Write Path

All mutation flows through `platform/settings/src/persist/writer.lua` - the
only module that writes the DB. `set`: find declaration → reject if not
`editable` → `defs.coerce` → run `validate_func` → JSON-encode (encrypt if
secret) → `INSERT ... ON CONFLICT (namespace, key) DO UPDATE` into
`kickside_settings` → write-through the `store.memory` cache. `unset`:
`DELETE` the row + drop the cache entry.

`validate_func` runs before persist, called as
`funcs.call(fn, { key, value, old_value, definition })`. It returns either
`(ok, err)` or a `{ valid, error }` table; a dispatch error or a false
result rejects the write and the message surfaces on the field. A rejected
write never persists.

`schema` is advisory and client-side only: it is surfaced verbatim in the
list row and drives the UI control plus client validation, but the server
never validates against it. Server authority is `defs.coerce` +
`validate_func` - put real invariants in a `validate_func`.

## Secrets

- `value_type: secret` values are AES-256-encrypted at rest, keyed by
  `ENCRYPTION_KEY` (64 hex chars). Without it, secret writes fail.
- `get` returns plaintext - the credential the calling code needs.
- `list` masks: a secret row carries no `value`/`default`, only
  `is_secret = true` and `has_value`. Never build an admin surface that
  expects `list` to return a secret's value.
- On cache warm, an undecryptable stored value (e.g. rotated key) is
  dropped, so reads fall back to the declared default rather than
  poisoning the cache.
- The UI renders a password input; an empty draft means "keep the stored
  value". Production secret settings are `visible: false` and edited
  through bespoke panels.

## Scope

`global` is the only implemented scope. `SCOPE_GLOBAL = "global"` is the
sole constant, an absent `scope` defaults to it, and the value is only
stored and echoed back - no read/write logic branches on it, and the DB PK
is just `(namespace, key)`. There are no user- or component-scoped
settings; the field is informational. Do not confuse it with unrelated
`scope:` fields elsewhere (component provisioning, block `config`
payloads).

## Storage Model

The DB stores overrides only; defaults live in the registry. A default
change in a module upgrade propagates immediately, and reset-to-default is
literally deleting the row (`unset`). Never store the default as an
override.

Reads are served from a boot-warmed `store.memory` cache. A cold cache is a
loud error - `"settings cache is not warmed"` - not a silent DB reload.
Consumers reading at boot must start after the cache-warm barrier or fail
clearly; they must not switch to a second DB/env read path.

## Gotchas

1. Custom fields go at the top level of the entry, not under `meta:`.
   Misplacing `namespace`/`key`/`value_type` silently drops the entry.
2. A `value_type` outside `TYPES` silently drops the whole definition.
3. `duration` must be a string `time.parse_duration` accepts; `json` must
   be a table; `bool` must be a real boolean. Mismatches fail the write
   with the coercion message.
4. The DB stores overrides only; never persist the default as an override.
5. A cold cache is a loud error; boot-time readers wait for the cache-warm
   barrier or fail clearly.
6. A namespace with only `visible: false` definitions vanishes from the UI
   entirely - no list rows, no auto-block. Build a bespoke panel or flip
   `visible: true`.
7. A bespoke block spanning several namespaces must list them all in
   `namespaces:`, or each uncovered namespace gets a duplicate auto-block.
8. A block's `component_tag` must resolve to a registered `view.component`
   `tag_name`. Bundle owner and entry owner can differ; keep
   `base_path`/`entry_point` pointed at whoever serves the bundle.
9. Secrets are masked in `list` but plaintext in `get`; `ENCRYPTION_KEY`
   must be present or secret writes fail. With no stored override, reads use
   the declaration's explicit default.
10. `editable: false` blocks writes but still lists/reads;
    `visible: false` hides from UI but stays writable - orthogonal.
11. Client-side `schema` validation is advisory; real invariants belong in
    a `validate_func`.
