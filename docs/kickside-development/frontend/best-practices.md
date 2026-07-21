# Kickside Frontend Practices

These conventions describe the current Kickside UI codebase. They are intentionally narrower than generic Vue guidance.

A module with builder-grade UI complexity may extend these with its own conventions doc instead of duplicating this one — see `platform/workflows/ui/CONVENTIONS.md` for the pattern.

## Vue And TypeScript

- Use Vue 3 with `<script setup lang="ts">`.
- Keep component state explicit with `ref`, `computed`, and small helpers.
- Prefer typed interfaces for API rows, component props, and emitted events.
- Avoid `any`; narrow unknown API data at module boundaries.
- Put behavior tests beside the UI code with Vitest.

## Styling

- Component CSS lives in `src/styles.css` and is imported with `?inline` by the web component entry.
- Use host theme variables (`--p-*`) for colors, borders, and text. No hex/brand-color literals in module UI; a module-local `--<prefix>-*` layer must derive from `--p-*` (e.g. `platform/workflows/ui/src/styles.css:1-8,12` derives `--wf-*` from `--p-content-background`/`--p-text-color` via `color-mix`, with fixed per-kind canvas hues as the only sanctioned exception because they encode meaning, not brand).
- Request host CSS through `hostCssKeys` only when needed.
- Do not hardcode one-off design systems inside module UI.
- Keep text and controls responsive; compact operational screens should stay dense and readable.

### Radius canon

There is no shared radius token yet. The vendored theme's only radius custom property, `--p-content-border-radius` (`6px`), is unused by application code. Until a real `--p-button-border-radius`-style token ships in `@wippy-fe/theme`, use the literal below directly — do not invent a new per-module alias (`--wf-radius-sm`, `--km-radius-sm`, `--pm-r-ctl`, ... are already-drifting private duplicates of the same constant; see `platform/workflows/ui/src/styles.css:53-54` for one such duplicate).

- **Buttons / inputs / icon-buttons** — `8px`
- **Cards / list containers** — `14px`
- **Chips / tags / badges** — `6px`
- **Count-pills / switches** — `999px`
- **Icon tiles (decorative, non-interactive)** — `~11px`
- **Alert / message boxes** — `10px`

Circles (`50%`, avatars/dots) and native toggle switches (`999px`, `role=switch`) are a different control class, not covered by the button row.

## Shared Web Components

**One widget per concern, reused by tag — never inlined or re-implemented.** If a shared web component already covers a concern, mount it; do not hand-roll a second picker, editor, or form for the same job.

- **Schema/JSON entry** — every surface that edits a JSON schema or a JSON value (boundary config, tool schemas, mapping editors, webhook schemas, rubric shapes) uses the one schema-editor component (`SchemaEditor.vue` in `platform/workflows/ui/src/app`, documented at `platform/workflows/ui/src/app/SchemaEditor.vue:9-16` as "ONE component behind every JSON-schema / JSON entry point"), which carries the AI-assist affordance for free. A surface that renders data driven by a schema (not editing the schema itself) mounts `wc-schema-form` (`platform/widgets/src/_index.yaml:296`, `auto_register: true`).
- **Resource/record selection** — mount `wc-component-picker` (`platform/widgets/src/_index.yaml:255`, `auto_register: true`) rather than building a local search-and-select list.
- Other shared pickers (icon, model, multiselect, channel, connection) live the same way under `platform/widgets/ui/src` — check there before writing a new one.

### Ship + consume by tag

Ship: a module builds a Vite lib entry into a self-registering ESM bundle, serves it from its own `static/` (`http.static`), and declares a `view.component` registry entry (`tag_name`/`base_path`/`entry_point` — see [host-spec.md](host-spec.md#view-component)). Set `auto_register: true` so the host preregisters the tag at boot and a consumer can drop the custom element straight into a template with no explicit load step (e.g. `platform/widgets/src/_index.yaml:255,296`, `platform/workflows/src/_index.yaml:182,211`).

Consume, in order of preference:
1. Drop the tag directly in the template when it is `auto_register: true`.
2. `loadByTagName(tag)` for a conditional/dynamic mount (see [proxy-api.md](proxy-api.md#loadbytagname)).
3. `WcMount.vue` (`platform/widgets/ui/src/app/WcMount.vue`) for a config-panel-shaped widget: it forwards `config`/`schema`/`meta`/`attrs` props and normalizes the `change`/`created`/`close` emit conventions so a host form doesn't hand-wire attribute sync itself.

**`useProps` camelCase rule.** `useProps` from `@wippy-fe/webcomponent-vue`
exposes declared kebab-case host attributes camel-cased inside the Vue root
(`workflow-id` -> `workflowId`). Read only the camel-cased property. A kebab-key
read silently returns `undefined`, so cover the declared mapping with a test
rather than adding a second read path.

## Icons

- Use `Icon` from `@iconify/vue`.
- Prefer Tabler icons.
- Do not inline SVGs for standard action icons.
- Decorative icons should be `aria-hidden="true"`; meaningful icon-only buttons need an accessible label or title.

## API And Realtime

- Use `api` from `@wippy-fe/proxy` for HTTP calls.
- Use `host.confirm` and `host.toast` for host-owned UX.
- Use `on` or shared realtime helpers for live updates.
- Use `loadByTagName` for nested declared web components.
- Never read local databases or registry files from UI code.

## Error Handling And Empty States

- Render API errors as errors.
- Do not replace failed catalogs, scopes, capabilities, or access bits with hardcoded fallback data.
- Do not swallow failed writes.
- Preserve server error messages when they are user-safe.
- Keep destructive actions behind confirmation.
- Every failure state is a directed moment: what happened, then what to do next. Never a raw dump (stack trace, bare object) and never a dead end. A terminal state with no reason shown is a defect, not an acceptable minimal state.
- When a failure carries a stable code, show the code plus a human-actionable message built from it — not the code alone, not a generic string that discards it. The canonical shape is `{ code, message }` (`platform/workflows/ui/src/app/failed-port.ts:17-24`, `additionalProperties: false`, both fields required) for a structured error crossing a port/edge/API boundary.
- When the source genuinely has no structured reason (an upstream swallowed it), say that plainly instead of inventing a plausible-sounding cause: `"No further detail was recorded for this failure."` (`platform/workflows/ui/src/app/RunNodeOutput.vue:105`), paired with a next step (retry, re-run, open the step) rather than left as a dead end.

## Honesty

A label, button, or affordance states what the control actually does today — never what it will do once a dependent feature lands. If a control cannot yet do what its label would imply, do not ship the label.

- Node/panel copy states current engine behavior, never an aspirational one a later stage might add (`platform/workflows/ui/src/app/logic-copy.ts:1-3`).
- A run that executed the unpublished draft canvas is labeled "Draft run", never a fake `v0` — because it never pinned a published version (`platform/workflows/ui/src/app/run-history.ts:70-75`).
- A read-only surface says so and offers no edit/restore affordance until the backing capability exists (`platform/workflows/ui/src/app/VersionHistoryPanel.vue:113`, `"Read-only"`, no edit/rollback controls).
- If a real API flag is known to be structurally wrong (e.g. a "has changes" indicator that reads true on every clean publish), do not surface it verbatim — derive a truthful signal from the underlying stream instead of showing noise (`platform/workflows/ui/src/app/version-history.ts:15` `hasUnpublishedEdits`, computed from the edit-event head vs. the version's `def_seq` rather than the raw flag).

## Vocabulary

User-facing strings must follow the glossary:

- **Capability** — trait
- **Automation** — flow as a generic noun
- **Data Sync** — poller
- **Destination** — sink
- **Source** — trigger when the UI is selecting a sync/source catalog item
- **Chat** — conversation/thread for user chat
- **Channel** — only an external room, such as Discord

Persisted keys and registry ids do not change just to improve labels. Add display mapping at the UI/API boundary.

## Tests

Add tests for:

- schema-driven rendering
- picker labels and declared titles
- error states
- destructive confirmations
- hidden/hide-zero public state fields
- realtime meta folding
- enum label mapping

Use bundle grep only as proof that a built static artifact picked up a specific UI change; do not use it as the only behavioral test.
