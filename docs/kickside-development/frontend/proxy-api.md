# Proxy API In Kickside Module UI

Module web components use `@wippy-fe/proxy` to talk to the host. This keeps auth, routing, realtime, and nested component loading consistent.

```ts
import { api, host, on, loadByTagName } from '@wippy-fe/proxy'
```

## `api`

`api` is the authenticated HTTP client. Use module APIs and let the server enforce authorization.

```ts
const { data } = await api.get('/api/v1/webhooks')
await api.post('/api/v1/automations', payload)
await api.delete(`/api/v1/webhooks/${encodeURIComponent(id)}`)
```

For uploads:

```ts
const form = new FormData()
form.append('file', file)
const { data } = await api.post('/api/v1/uploads', form, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
```

## `host`

Use host UX services for shell-owned interactions:

```ts
const ok = await host.confirm({
  header: 'Remove webhook',
  message: 'Remove this webhook?',
  icon: 'tabler:trash',
  acceptLabel: 'Remove',
  rejectLabel: 'Cancel',
  acceptClass: 'p-button-danger',
})

if (ok) {
  host.toast({ severity: 'success', summary: 'Removed', detail: label })
}
```

Common current uses:

- `host.confirm(...)`
- `host.toast(...)`
- `host.handleError('auth-expired', errorLike)`

Do not create module-local replacements for global confirmation, toast, or auth-expired handling.

## `on`

Use `on` for host realtime events.

```ts
const off = on(`component.${componentId}`, (message: unknown) => {
  // fold or refetch local state
})

onBeforeUnmount(() => off?.())
```

Prefer shared helpers such as `platform/widgets/ui/src/app/componentRealtime.ts` when a surface only needs component meta updates.

## `loadByTagName`

Use `loadByTagName` to mount another declared web component by tag.

```ts
const el = await loadByTagName('wc-component-picker')
el.setAttribute('config', JSON.stringify(config))
container.replaceChildren(el)
```

This is the correct path for registry-driven nested components such as pickers, resource renderers, KB dialogs, and webhook detail panels.

## Error Policy

The proxy does not make failed API calls safe. UI code must show errors truthfully:

- do not substitute fake catalogs after a failed list call
- do not hide permission errors
- do not turn failed destructive actions into success toasts
- preserve server messages when possible

Small local formatting helpers are fine; policy decisions belong on the server.
