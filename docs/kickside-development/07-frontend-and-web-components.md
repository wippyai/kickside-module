# Frontend And Web Components

The frontend is host-based. Kickside's SPA shell runs as a Wippy web app inside
the Web Host. Feature modules ship their own web components and declare their
surfaces in the registry. Module UI is module-owned: source in `<module>/ui/`,
a checked-in built bundle in `<module>/static/`, exposed by registry entries in
the same module's `src/_index.yaml`.

Deeper references:

- [frontend/component-guide.md](frontend/component-guide.md) - building a web component
- [frontend/host-spec.md](frontend/host-spec.md) - host/registry contract
- [frontend/proxy-api.md](frontend/proxy-api.md) - the `window.$W` proxy API
- [frontend/best-practices.md](frontend/best-practices.md) - review rules
- [frontend/app-guide.md](frontend/app-guide.md) - changing the host app itself
- [frontend/app-checklist.md](frontend/app-checklist.md) - host app checklist

## Registry Kinds

### `view.page` - the app shell

The whole SPA is one host-rendered page, declared in the app package
(`app/src/app/views/_index.yaml`):

```yaml
kind: registry.entry
meta:
  type: view.page
  name: main
  url: /app
  base_path: app/main
  entry_point: app.html
proxy:
  enabled: true
```

The Web Host loads it in an iframe, injects CSS/theme assets, and provides the
proxy API through `window.$W`. Module authors do not create a `view.page`. A
feature surface is a `view.component` plus a `ui.nav_item`.

### `view.component` - a module-owned web component

A registry entry with `meta.type: view.component` names the bundle's custom
element tag and where the host fetches it. Field-by-field reference:
[frontend/host-spec.md](frontend/host-spec.md#view-component). Two optional
fields matter beyond that base set: `auto_register: true` preregisters the tag
at boot so consumers can drop it straight into templates, and `props` is a
JSON-schema of host attributes (e.g. an automation `trigger_config_view`).

### `fs.directory` + `http.static`

`fs.directory` points at the checked-in `./static`; `http.static` mounts it on
the gateway server ([frontend/host-spec.md](frontend/host-spec.md#served-bundle)).
`base_path` on the view equals the `http.static` `path` without the slash.

### Minimal complete `_index.yaml` for a module-owned page

```yaml
version: "1.0"
namespace: kickside.example

entries:
  - name: ui_fs
    kind: fs.directory
    meta:
      comment: Built kickside-example web component bundle.
    directory: ./static

  - name: ui_static
    kind: http.static
    meta:
      server: app:gateway
    path: /kickside-example         # base_path below == this minus the leading slash
    fs: kickside.example:ui_fs
    options:
      cache: "no-cache"

  - name: example_view
    kind: registry.entry
    meta:
      type: view.component
      name: example_view
      title: Example
      announced: true
      tag_name: kickside-example
      base_path: kickside-example
      entry_point: index.js
      icon: tabler:component

  - name: nav_item
    kind: registry.entry
    meta:
      type: ui.nav_item
      section: ""
      path: /example
      route_name: example
      title: Example
      comment: Short one-line description.
      icon: tabler:component
      order: 60
      render: component
      component_tag: kickside-example
```

Real modules add `ns.requirement` entries (`ui_server`, `api_router`) that
rewrite `meta.server`/`meta.router` so mounts attach to the installing app's
configured server and router (`platform/uploads/src/_index.yaml`). Copy them
for re-targetable installs; inline `meta.server: app:gateway` is sufficient
otherwise.

## Build And Serve

Module UI source lives in `<module>/ui/`, built with Vite plus
`@wippy-fe/vite-plugin` into the checked-in `<module>/static/` bundle. The file
layout, entry-point shape (`WippyVueElement`, `define(...)`, `styles.css?inline`),
and full Vite config live in
[frontend/component-guide.md](frontend/component-guide.md).

Kickside-specific facts:

- Commands: `npm run build` (writes `./static`), `npm run dev` (watch),
  `npm run test` (vitest). Module Makefile: `make build`, `make dev`,
  `make publish`.
- Publishing embeds the bundle: `wippy publish ... --embed ui_fs`; module
  `wippy.yaml` lists `embed: [kickside.<module>:ui_fs]` and excludes `.map`
  files via `exclude:`.
- `static/` is generated but checked in. Never edit it by hand; change
  `ui/src`, rebuild, commit both.

## Navigation

Nav is registry-driven. A module declares one `ui.nav_item`; installing the
module adds the surface, uninstalling removes it. The SPA calls
`/api/v1/nav/list`, receives effective nav items and categories, and decides
only how to render the declared surface.

### `ui.nav_item` fields

Normalized in `platform/ui/src/nav.lua`, typed in `platform/ui/src/types.lua`:

- **`path`** — in-app route, must start with `/`
- **`route_name`** — stable key; also the default `surface` name
- **`title`** — label, max 80 chars
- **`icon`** — Tabler icon `namespace:name`; invalid falls back to `tabler:square`
- **`order`** — sort key; ties break by label; default 500
- **`category`** — grouping; empty = uncategorized root bucket, rendered first, untitled
- **`render`** — `component` mounts `component_tag`; anything else uses the `surface` renderer keyed by `surface`/`route_name`
- **`component_tag`** — tag to mount when `render: component`
- **`badge`** — optional live count/dot bound to component meta
- **`private`** — in meta; omits the item from nav

### Live nav badges

From the inbox module (`platform/inbox/src/_index.yaml`):

```yaml
badge:
  source: component_meta
  component: { scope: actor, cardinality: singleton, impl_id: kickside.inbox:inbox_binding }
  field: pending_count
  field_type: integer
  style: count
  hide_zero: true
  tone: accent
```

Badges resolve server-side against the caller's own component via one
access-filtered `component.query` and stay live over the single existing
websocket. Tones are fixed vocabulary
(`neutral/accent/success/info/warn/danger`), never raw colors.

### Surface contract

The app's `WcSurface` mounts module web components by tag:

- validates the custom element tag
- calls host `loadByTagName(tag)`, which fetches `<base_path>/<entry_point>`
  from the module's `http.static` mount
- creates the element
- sets a `route` attribute with the in-surface route for deep links
- listens for `navigate` events

Navigation rule:

- absolute path: cross-surface route
- relative path: deep link under the current surface base path

A simple page component can ignore `route` and `navigate`.

## Widgets

There is no separate "block" kind. The reusable unit is a shared web component
(widget), declared like any `view.component` but living in `platform/widgets/`
and reused across modules by tag. Doctrine: one widget per concern, reused by
tag - never inlined or re-implemented.

All widgets are entries within a single bundle served from `/kickside-widgets`.
Each `view.component` points at its own `entry_point` inside that one mount and
sets `auto_register: true`:

```yaml
- name: component_picker_view
  kind: registry.entry
  meta:
    type: view.component
    name: component_picker_view
    title: Component picker
    announced: true
    auto_register: true
    tag_name: wc-component-picker
    base_path: kickside-widgets
    entry_point: component_picker.js
    icon: tabler:message-circle
  props:
    type: object
    properties:
      source: { type: string, default: "/api/v1/threads" }
      thread-class: { type: string, default: "" }
      value: { type: string, default: "" }
```

Shipped widgets: `wc-component-picker`, `wc-icon-picker`, `wc-model-picker`,
`wc-multiselect`, `wc-channel-picker`, `wc-connection-picker`,
`wc-schema-form`. Vue sources live under `platform/widgets/ui/src/<widget>/`
plus shared helpers in `platform/widgets/ui/src/app/` (`componentRealtime.ts`,
`WcMount.vue`, `datetime.ts`), importable via the `@widgets` alias set in
`vite.config.ts`.

Consume, in order of preference:

1. Drop the tag directly when the widget declares `auto_register: true`.
2. `loadByTagName(tag)` for conditional or dynamic mounts.
3. `WcMount.vue` for config-panel-shaped widgets.

A config-schema field can name a picker/detail web component:

```yaml
config_schema:
  thread_id:
    picker: wc-component-picker
    role: primary
    title: Webhook
    detail: kickside-webhook-detail
```

## Page Header Canon

List pages share a visual convention for the header row, not a shared
component: one compact row - icon tile, title (page description as the title's
tooltip so the toolbar stays one row), right-aligned actions cluster (search,
filters, muted count, primary action rightmost). Shared class vocabulary:
`kx-head`, `kx-head-icon`, `kx-head-text`, `kx-title`, `kx-head-actions`,
`kx-count`, `kx-search`, `kx-btn kx-btn-primary`.

From the uploads page (`platform/uploads/ui/src/app/uploads.vue`):

```html
<header class="kx-head">
  <div class="kx-head-icon"><Icon icon="tabler:files" aria-hidden="true" /></div>
  <div class="kx-head-text">
    <h1 class="kx-title">Uploads</h1>
    <p class="kx-head-sub">Files your agents can read and process.</p>
  </div>
  <div class="kx-head-actions">
    <span class="kx-count">{{ total }} file{{ total !== 1 ? 's' : '' }}</span>
    <!-- search, status filter -->
    <button class="kx-btn kx-btn-primary">Upload</button>
  </div>
</header>
```

Caveat: the `kx-*` classes are copied per module into each module's
`styles.css` - there is no shared stylesheet or `<PageHeader>` widget.
Replicate the class names and structure. Colors always come from host theme
vars (`--p-text-color`, `--p-text-muted-color`, `--p-primary-color`,
`--p-primary-contrast-color`).

## Component Meta In UI

Lists render component rows plus public meta. Subscribe to the canonical
component topic only when live updates are needed: topic
`component.<component_id>`, event `component.meta.changed`, `data.meta` = full
meta snapshot. Merge the snapshot in one shared place. Do not create
per-feature status polling, `get_stats` fallbacks, or internal worker topics
for list cards.

Detail pages may listen to domain/thread wakeups, but they reload details from
the owning API/read model. Realtime is not the database.

## Component Workflows

A component UI that needs user-adjustable internal work mounts the platform
view and passes the component instance id:

```html
<kickside-component-workflows component-instance-id="component-id"></kickside-component-workflows>
```

The component author does not create a workflow manifest or a local editor:

- declare output events on the component binding; the canonical Ports become
  the component's Event workflow choices;
- declare a Behavior only for an internal decision or operation with a shipped
  default that the user may replace;
- mount the shared view from a maintained Vue surface and forward its
  `navigate` event through the normal host bridge.

The shared view composes existing platform surfaces. Defaults remain Behavior
bindings. Event workflows remain ordinary Automations parented to the
component. The component contributes no new storage, execution path, catalog,
or vocabulary. The contract selects a published Workflow through its stable
Start/Finish interface; the component UI does not inspect or depend on the
internal graph shape.

## API Access

Frontend code calls module APIs through the host proxy/API client:

- no direct DB
- no hardcoded storage URLs
- no secret-bearing config in UI state
- no direct provider credentials

If a frontend needs upload/content access, use the owning API or a signed
token issued for that purpose.

## Gotchas

1. `static/` is generated but committed - never hand-edit. If only backend
   registry/docs changed, do not rebuild.
2. `useProps` camelCases kebab attributes; read the camel key first - see
   [frontend/best-practices.md](frontend/best-practices.md).
3. `process.env` must be shimmed in `vite.config.ts`:
   `define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' }`.
4. The props schema lives in `package.json` under `wippy.props`, read by
   `index.ts` and package tooling.
5. `auto_register` defaults to false. Page surfaces mounted by `WcSurface` do
   not need it; bare-tag widgets must set it.
6. `base_path` equals the `http.static` path minus the leading slash. A
   mismatch fails silently as "Component is not available in this build".
7. One bundle can expose many components - several `view.component` entries
   share one `base_path` with different `entry_point`s (automation ships
   `index.js`, `trigger_config.js`, `automation_config.js`).
8. List counts/status come from component public meta, not custom polling.
   Subscribe to `component.<id>` (`component.meta.changed`); no per-feature
   stats polling or worker topics.
9. Detail views reload through the owning API - realtime is a wakeup, then
   re-`api.get`.
10. Never bypass the proxy. All HTTP goes through `api` from
    `@wippy-fe/proxy`; use `host.confirm`/`host.toast`/`host.handleError`.
    Authenticated file URLs 401 on bare `<a href>` - fetch as blob.
11. Radius/tone canon: literal radii and `--p-*` colors per
    [frontend/best-practices.md](frontend/best-practices.md); each UI package
    has `radius-canon.test.ts` enforcing it.
12. Honesty and error rules: render real API errors, put destructive actions
    behind `host.confirm`, use structured errors `{ code, message }`.
13. Component-kind create/manage views are declared via binding meta
    (`meta.component.create.view` / `meta.manage.view`,
    `component.create.surface: popup`), never hardcoded in the host.
14. Splash/onboarding surfaces are registry-declared (`ui.splash` +
    `ui.splash.step`, steps may set `component_tag`), returned inline on
    `/nav/list`.

Review gate: the Frontend Checklist in [09-checklists.md](09-checklists.md).
