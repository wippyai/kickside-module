# Kickside Frontend Documentation

The public [wippyai/kickside-module](https://github.com/wippyai/kickside-module)
repository contains web-component source, its registry declaration, tests, and
this frontend guide.

Kickside frontend code is module-owned: a module keeps its UI source, built
bundle, and registry declarations together. The default UI surface is a Wippy
web component; full iframe applications exist in the Wippy host, but new module
UI starts as a web component unless there is a concrete reason to own a full
app shell. The build/host mechanics live in the guides below.

## Documentation Index

- **[component-guide.md](component-guide.md)** — Creating or editing a module-owned Kickside web component
- **[app-guide.md](app-guide.md)** — Understanding the host app versus module web components
- **[app-checklist.md](app-checklist.md)** — Review checklist before shipping a UI change
- **[proxy-api.md](proxy-api.md)** — Current proxy usage from module web components
- **[host-spec.md](host-spec.md)** — Registry entries that make a web component load in the app
- **[best-practices.md](best-practices.md)** — Vue, styling/radius canon, shared-widget reuse, error/empty-state and honesty rules, tests
- **[Kickside Development Handbook](../developer-handbook.md)** — Backend/module contracts, ports, automations, components, and glossary

## Reading Order

1. Read [component-guide.md](component-guide.md) before adding a new module UI.
2. Read [host-spec.md](host-spec.md) when wiring `_index.yaml`.
3. Read [proxy-api.md](proxy-api.md) when calling APIs, confirmations, toasts, realtime, or nested web components.
4. Use [app-checklist.md](app-checklist.md) before review or publish.
