# Kickside UI Change Checklist

Use this before review or publish for any module UI change.

## Source And Ownership

- [ ] The UI lives in the module that owns the backend surface.
- [ ] The source is under `platform/<module>/ui/src`.
- [ ] Built files are under `platform/<module>/static`.
- [ ] No module-specific screen was added to the host app.
- [ ] No file in `static/` was edited by hand.

## Registry Wiring

- [ ] The module declares `fs.directory` for `./static`.
- [ ] The module declares `http.static` for the bundle path.
- [ ] The module declares a `registry.entry` with `meta.type: view.component`.
- [ ] The view has `tag_name`, `base_path`, `entry_point`, `title`, and `icon`.
- [ ] Component create/manage views are referenced from the owning binding's `meta.component` block when applicable.
- [ ] Field detail widgets and pickers are declared in schema/port metadata, not hardcoded in host code.

## Component Entry

- [ ] The entry subclasses `WippyVueElement`.
- [ ] The entry calls `define(import.meta.url, ElementClass)`.
- [ ] Props are declared as JSON schema.
- [ ] Events are typed in TypeScript when emitted.
- [ ] `hostCssKeys` requests only CSS the component needs.
- [ ] `styles.css` is imported with `?inline`.

## Runtime Behavior

- [ ] API calls use `@wippy-fe/proxy` `api`.
- [ ] Confirmations use `host.confirm`.
- [ ] Toasts use `host.toast`.
- [ ] Realtime subscriptions use `on` or shared widget helpers.
- [ ] Nested web components use `loadByTagName`.
- [ ] The UI has loading, empty, error, and success states.
- [ ] API failures do not fall back to fake data.

## Vocabulary And UX

- [ ] User-visible text follows the glossary.
- [ ] Use "Capability" for user-facing trait surfaces.
- [ ] Use "Destination" for writable outputs.
- [ ] Use "Chat" for user chat sessions.
- [ ] Use "Channel" only for external rooms such as Discord or Slack.
- [ ] Avoid raw enum values in labels.
- [ ] Use declared titles from schemas and catalogs instead of ids.

## Verification

Run these from the UI package when code changed:

```sh
npm run test
npm run build
```

Run module backend tests and lint when `_index.yaml`, Lua, or APIs changed:

```sh
wippy lint --json
wippy run test
```

Check the generated bundle was updated when expected:

```sh
git status --short -- platform/<module>/ui platform/<module>/static
```
