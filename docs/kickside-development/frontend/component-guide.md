# Building Kickside Web Components

Kickside module UI is a web component owned by the module that serves it. The source lives in `platform/<module>/ui/`; the built files live in `platform/<module>/static/`; `_index.yaml` declares how the host loads it.

Do not create a separate frontend package for normal module UI. The component is part of the module contract and is published with that module.

## File Layout

Use this shape for a module that owns UI:

```text
platform/<module>/
├── src/
│   └── _index.yaml
├── static/              # built bundle, checked in
└── ui/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── <entry>.ts
        ├── app/
        │   └── <Component>.vue
        ├── styles.css
        ├── types.ts
        └── *.spec.ts
```

Shared widgets live in `platform/widgets/ui/src` and are imported through the local `@widgets` alias when a module's Vite config declares it.

## Entry Point

Each entry subclasses `WippyVueElement`, imports inline CSS, declares a JSON schema for attributes, and calls `define(import.meta.url, ElementClass)`.

```ts
import { WippyVueElement, define } from '@wippy-fe/webcomponent-vue'
import type { WippyElementConfig, WippyPropsSchema } from '@wippy-fe/webcomponent-vue'
import Root from './app/Root.vue'
import stylesText from './styles.css?inline'

interface Props {
  'component-id'?: string
}

interface Events {
  saved: { id: string }
}

const PROPS_SCHEMA: WippyPropsSchema = {
  type: 'object',
  properties: {
    'component-id': { type: 'string' },
  },
}

class KicksideExampleElement extends WippyVueElement<Props, Events> {
  static get wippyConfig(): WippyElementConfig<Props> {
    return {
      propsSchema: PROPS_SCHEMA,
      hostCssKeys: ['fontCssUrl', 'themeConfigUrl'] as const,
      inlineCss: stylesText,
    }
  }

  static get vueConfig() {
    return { rootComponent: Root }
  }
}

export async function webComponent() {
  return KicksideExampleElement
}

define(import.meta.url, KicksideExampleElement)
```

Use more than one entry when the module has separate create/manage/detail components. For example, webhooks builds `index`, `create`, and `detail` entries from one UI package.

## Vite Configuration

The build output for module UI is the module's `static/` directory.

```ts
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { wippyComponentPlugin } from '@wippy-fe/vite-plugin'
import { defineConfig } from 'vite'

const entries = {
  index: resolve(__dirname, 'src/index.ts'),
}

export default defineConfig({
  resolve: { alias: { '@widgets': resolve(__dirname, '../../widgets/ui/src') } },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('wc-') || tag.startsWith('kickside-'),
        },
      },
    }),
    wippyComponentPlugin(),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },
  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../static'),
    emptyOutDir: true,
    lib: {
      entry: entries,
      name: 'KicksideExample',
      formats: ['es'],
    },
    rollupOptions: {
      input: entries,
      external: ['vue', '@iconify/vue', '@wippy-fe/proxy'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      },
    },
    sourcemap: true,
  },
})
```

Only externalize dependencies that the host import map supplies. Current module UI commonly externalizes `vue`, `@iconify/vue`, and `@wippy-fe/proxy`.

## Registry Wiring

The module registry must serve the built files and declare a view component.

```yaml
- name: ui_fs
  kind: fs.directory
  meta:
    comment: Built example web component bundle.
  directory: ./static

- name: ui_static
  kind: http.static
  meta:
    server: app:gateway
  path: /kickside-example
  fs: kickside.example:ui_fs

- name: example_view
  kind: registry.entry
  meta:
    type: view.component
    title: Example
    announced: true
    tag_name: kickside-example
    base_path: kickside-example
    entry_point: index.js
    icon: tabler:component
```

If the component creates or manages a component kind, reference the view from the binding metadata:

```yaml
meta:
  component:
    create:
      view: kickside.example:example_create_view
    manage:
      view: kickside.example:example_manage_view
```

The generic host reads this declaration. Do not add a hardcoded mount to the host for a module-specific UI.

## Vue Component Rules

- Use `<script setup lang="ts">`.
- Use `@wippy-fe/proxy` for API, host actions, realtime subscriptions, and nested component loading.
- Use `host.toast` and `host.confirm` for user notifications and confirmations.
- Render loading, empty, error, and success states.
- Keep display strings user-facing and aligned with the glossary: Capability, Automation, Data Sync, Destination, Chat, Channel.
- Use `Icon` from `@iconify/vue`; prefer Tabler icons.
- Use CSS variables from the host theme (`--p-*`) instead of hardcoded theme colors.
- Put unit tests beside the UI code when behavior can regress.

## Build And Verify

From the UI directory:

```sh
npm run test
npm run build
```

Commit `ui/` source changes and the regenerated `static/` files together. If only docs or backend registry entries changed, do not rebuild static files.
