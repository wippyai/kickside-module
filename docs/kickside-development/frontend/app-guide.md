# Kickside App And Module UI Guide

Kickside has two frontend layers:

1. The host application under `app/frontend/applications/main`, which owns navigation, authentication shell, pages, web component loading, and iframe/websocket plumbing.
2. Module-owned web components under `platform/<module>/ui`, which implement product surfaces for one module and are served from that module's `static/` directory.

Most feature work belongs in layer 2. Add or edit the module web component, declare it in the module registry, and let the host load it through `view.component`.

## When To Touch The Host App

Touch `app/frontend/applications/main` only when changing host behavior itself:

- global navigation or account surface loading
- component/page mounting infrastructure
- WebSocket or proxy bootstrap
- global error handling
- global branding, theme, or shell layout

Do not put module-specific screens, catalogs, or workflows in the host app. Those belong to the module that owns the backend contract.

## When To Add A Module Web Component

Add module UI when a backend module exposes a user surface:

- create or manage component instances
- configure an Automation kind
- render a registry-driven picker or detail panel
- manage provider connections, credentials, files, knowledge bases, skills, or settings
- render a resource through a declared renderer

The owning module declares where the component appears: settings tabs, component create/manage views, Automation create views, field detail widgets, or explicit web component mounts.

## Data Access Through UI

Module web components use the proxy layer:

```ts
import { api, host, on, loadByTagName } from '@wippy-fe/proxy'
```

- `api` is the authenticated HTTP client.
- `host` provides host-owned UX actions such as confirmation, toast, navigation, and auth-expired handling.
- `on` subscribes to realtime host events.
- `loadByTagName` loads another declared web component by custom element tag.

Never bypass module APIs by reading local databases from UI code. The server owns authorization, projection shape, and error vocabulary.

## Module UI Build Contract

Each module UI package should:

- build to `../static`
- use `@wippy-fe/vite-plugin`
- externalize only host-provided dependencies
- keep the web component tag stable once declared
- rebuild static bundles after changing `ui/src`
- keep tests in the UI package

The package `browser`/`files` metadata can remain for Wippy package tooling, but the Kickside runtime loads the built files through `http.static` and `view.component`.

## Routing

Module web components should not create their own app router unless they intentionally own a large dedicated surface. Prefer local state, tabs, and declared child components. The host owns top-level navigation.

If maintaining the host app, use the existing router and proxy bootstrap in `app/frontend/applications/main/src`; do not introduce a second shell.

## Error Handling

Use typed backend errors and surface the server message. Preferred UI pattern:

- keep an `error` ref for page/form errors
- call `host.toast` for successful destructive/important actions
- call `host.confirm` before destructive actions
- route 401/auth-expired through the existing host handler where the local API helper already does that

Do not substitute fake catalogs, fake capabilities, or hardcoded fallback data after an API failure. Show the error state.
