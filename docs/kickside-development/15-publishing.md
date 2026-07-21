# Publishing

For a new repository, begin with the public
[wippyai/kickside-module](https://github.com/wippyai/kickside-module) template.
Its initializer keeps package, namespace, UI, SQL, tests, and publish metadata
consistent, and its release check exercises the full pre-publish contract.

Every module is a self-contained Wippy package: a root `wippy.yaml` manifest,
`src/` entries, and an optional UI bundle. Publishing pushes the package to the
Wippy Hub, where other modules and app compositions resolve it by
`vendor/module` and version.

Backticked paths cite the Kickside monorepo; the examples are complete on
their own.

## The Manifest (`wippy.yaml`)

From `platform/oauth/wippy.yaml` (keywords and exclude lists trimmed):

```yaml
organization: kickside
module: oauth
description: Kickside OAuth — OAuth 2.0 connection management with PKCE, encrypted token storage, and background refresh. Exposes the connector + oauth_connection contracts that provider plugins bind to.
license: BUSL-1.1
repository: https://git.wippy.ai/kickside/kickside
homepage: https://wippy.ai
keywords:
  - kickside
  - oauth
  - connections
exclude_meta:
  type:
    - test
exclude:
  - "test/**"
  - "test:**"
  - ".wippy/**"
  - ".wippy:**"
  - "ui/node_modules/**"
  - "ui/coverage/**"
  - "ui/dist/**"
  - "static/*.map"
  - "static/**/*.map"
  - "src/**/*.spec.ts"
```

- **`organization`** — Vendor; `kickside` for first-party modules
- **`module`** — Package name; full identity is `organization/module`
- **`version`** — Optional explicit release input; omit it in reusable source templates and let the publisher select the next Hub version
- **`description`** — One-paragraph module summary
- **`license`** — SPDX id (`BUSL-1.1` for kickside modules)
- **`exclude_meta.type: [test]`** — Strips every `meta.type: test` entry from the package
- **`exclude`** — Glob list; strips the harness, `.wippy/`, `node_modules`, sourcemaps

Exclude globs come in path form (`test/**`) and namespace form (`test:**`);
ship both for anything that exists as files and as registry entries.

Modules that ship a web component add an `embed:` block naming the
`fs.directory` entries to bundle. The app root embeds its shell:

```yaml
embed:
  - app:app_fs
```

## Publish Commands

Per module:

```sh
wippy publish --create --module-visibility private --module-type plugin
```

- `--create` registers the module on first publish.
- `--module-visibility` is `private` for kickside modules.
- `--module-type` is `library`, `plugin`, or `application` (see release order).
- `--embed <entry>` embeds a built UI bundle (for example `--embed ui_fs`).
- `--dry-run` builds and validates without uploading.

Modules with a build step own a Makefile `publish` target. Manifest-only
module, `platform/oauth/Makefile`:

```make
MODULE := oauth
TYPE   := plugin
VIS    := private

.PHONY: publish lint test
lint:
	wippy lint
test:
	cd test && wippy run test
publish:
	wippy publish --create --module-visibility $(VIS) --module-type $(TYPE)
```

Module with a UI bundle, `platform/models/Makefile` - `publish` depends on
`build` and embeds the result:

```make
EMBED  := --embed ui_fs

build:
	cd ui && npm install && npm run build
publish: build
	wippy publish --create --module-visibility $(VIS) --module-type $(TYPE) $(EMBED)
```

## Release Order

The whole graph publishes foundation-first (`release.sh`): a module's
dependencies must be on the Hub before the module itself.

- **1**
  - **Tier:** `core/contract`
  - **Module type:** `library`
- **2**
  - **Tier:** rest of `core/*`
  - **Module type:** `library`
- **3**
  - **Tier:** `platform/*`
  - **Module type:** `plugin` (`platform/transform` is `library`)
- **4**
  - **Tier:** `sso`
  - **Module type:** `plugin`
- **5**
  - **Tier:** `app`
  - **Module type:** `application`

`core/contract` goes first because everything binds to it; `app` goes last
because it composes the whole graph. The release script uses a module's
Makefile `publish` target when one exists, otherwise calls `wippy publish`
directly and reads `embed:` entries from the manifest.

## Release Versions

With no `version` in `wippy.yaml`, `wippy publish` reads the Hub's latest
release and selects the next valid version. This is the canonical shape for a
reusable module repository because a stale source field cannot accidentally
request an already-published release.

Release automation that needs an exact version supplies `--version` at publish
time. Never copy that release number into `ns.dependency.version`: dependency
source declares compatibility, while locks record exact resolved releases.

## Declaring Dependencies

Dependencies are `kind: ns.dependency` registry entries; there is no
dependency list in `wippy.yaml`. What publishing needs to know:

- Every dependency's `component: vendor/module` must already be on the Hub
  before the module publishes (see release order above).
- `version` is a compatibility constraint, never an exact release selected at
  authoring time. Prefer `"*"` for shared Wippy/Kickside platform dependencies;
  use a lower-bound range only when the module truly needs an introduced API.
  The generated lock chooses the concrete release.
- Never copy a resolved lock version back into `ns.dependency.version`.

The two declaration idioms - module-side `__dependency.<vendor>.<module>`
entries and app-side composition wiring with `parameters` - are covered in
[16-conventions.md](16-conventions.md#dependencies-and-wiring); page 13 shows
how test harnesses wire the same slots through the bootloader dependency.

### Lockfiles

Generated lockfiles are never committed at module roots. Only two kinds of
`wippy.lock` are checked in: the app composition root (pinning `name` +
`version` + `hash` per resolved module) and each module's `test/wippy.lock`
harness lock. A module's own root lock is regenerated on demand.

## Pre-Publish Checklist

Use the Publishing Checklist in [09-checklists.md](09-checklists.md).
