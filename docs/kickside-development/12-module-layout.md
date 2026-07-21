# Module Layout

Every module follows the same on-disk shape. This is the canon for where a file
goes, not a style preference.

## Module Shape

```text
<module>/
  wippy.yaml
  src/
  test/
  ui/       # optional, source for module-owned web components
  static/   # optional, generated publish assets from ui/
```

## `src/` Root

The `src/` root holds only:

- `_index.yaml`
- `consts.lua`
- `types.lua`
- the primary domain lib(s), named for the module's job, never `lib.lua` -
  the primary lib takes the module's name
- module-level smoke/packaging tests and colocated unit tests

Nothing else lives at `src/` root: no endpoint handlers, no repos, no
migrations, no single-purpose functions, no ad hoc test tooling. Reusable
conformance kits are the named exception: third-party implementer kits live in
`src/testing/`.

## `api/`

HTTP endpoint handlers only, named `verb_noun.lua` (no `_handler` suffix),
plus api-local helpers such as `errors.lua` and `query_params.lua`.

`api/public/` holds unauthenticated endpoints.

## `binding/`

Contract-binding functions, named `verb_noun_func.lua`.

## `persist/`

Repos, readers/writers, projections, read models, and event schemas.

- `repo.lua` when the module has a single repo.
- `<entity>_repo.lua` when it has several.
- Projections are named `<domain>_projection.lua`.

## `migrations/`

`NN_description.lua`. Exactly one `migrations/` directory per module.

## `security/`

The module's security policies.

## `sink/`, `traits/`, `registry/`, `service/`

- `sink/` - writable sink implementations.
- `traits/` - agent-facing tools; the one idiom, no parallel `agent/`/`tools/`
  dirs. Inner folders per trait family (`traits/<family>/`) are allowed where
  they read better; lone tools stay flat at `traits/`.
- `registry/` - registry read-models.
- `service/` - long-running workers/processes.

## Domain Subdirectories

Domain subdirs are named for the domain, for example `ingress/`,
`discovery/`, `responder/` - never `core/` in platform modules. Providers
name their API-client layer `client/`.

## Web Component Assets

Modules that ship web components keep source in `ui/` and publish built assets
from `static/`. The `static/` directory is generated and checked in because Wippy
packages serve it directly through `fs.directory` + `http.static` entries.

Do not edit `static/*.js`, hashed chunks, or source maps by hand. Change `ui/`,
run the module's UI build, and commit the regenerated `static/` output when the
module publishes a web component.

## Naming

No module-name-prefixed filenames inside a module: `repo.lua`, not
`oauth_repo.lua`.

## Test Placement

- Unit tests colocate as `<file>_test.lua` next to the source they prove.
- Anything test-only that needs registration - stubs, probes, fixtures, test
  procs - lives in the module's `test/` harness.
- Conformance kits meant for third-party implementers ship in `src/testing/`;
  they are product API, not harness scratch.

This canon is normative for all modules, including providers. Deviations are
defects.

## Canon Vs Shipping Modules

The canon above is what new modules must follow. Shipping modules follow it
unevenly, and the split is consistent:

- **Directory taxonomy: `api/`, `binding/`, `persist/`, `migrations/`, `security/`, `service/`, domain subdirs** — Consistently followed
- **`api/` handlers `verb_noun.lua`, `api/public/` for unauthenticated** — Consistently followed
- **`binding/` functions `verb_noun_func.lua`** — Consistently followed
- **Colocated `<file>_test.lua` unit tests** — Consistently followed
- **`src/` root holds only `_index.yaml` + `consts.lua` + `types.lua` + one module-named lib** — Violated
- **No module-name-prefixed filenames** — Violated

Concrete deviations:

- `platform/oauth/src/` has several root domain libs (`connection_manager.lua`,
  `creds.lua`, `form.lua`, `token_refresh_core.lua`, ...), no `consts.lua`, and
  no single lib named `oauth.lua`.
- `platform/oauth/src/persist/oauth_repo.lua` is the exact module-name-prefixed
  pattern this page forbids - the anti-example exists in the tree.
- `platform/models/src/` also carries several root libs (`cache.lua`,
  `resolver.lua`, `secrets.lua`, `model_catalog.lua`); its primary lib is
  `model_catalog.lua`, not `models.lua`. Its `persist/repo.lua` obeys the
  naming rule that oauth violates.

The canon remains normative: new modules follow the strict rules, and the
deviations above are defects to fix when their modules are touched, not
precedent to copy.

## Exceptions

Moving an applied migration ships the plain tracking-row rewrite in the same
change; fresh installs are unaffected.

An endpoint whose handler is a contract/binding function keeps its endpoint
entry colocated in `binding/` (short func refs); `api/` is for pure HTTP
handlers.
