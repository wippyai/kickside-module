# Kickside Module Template

A template for an independently versioned Kickside module. It includes a
registry namespace, typed automation port,
contract binding, persistence layer, SQLite/PostgreSQL migration, authenticated
API, module-owned web component, standalone test harness, release checks, and
the Kickside development handbook.

The module builds and tests without a Kickside source checkout. Wippy and
Node.js are required. Publishing requires a Wippy Hub account.

## Create a repository

Create a repository from this GitHub template:

```bash
gh repo create my-company/invoices \
  --template wippyai/kickside-module --private --clone
cd invoices

make init \
  ORG=my-company \
  MODULE_NAME=invoices \
  TITLE="Invoices" \
  GITHUB_OWNER=my-company

make verify
```

The initializer changes package identity, root namespace, custom-element tag,
route, SQL names, test identity, environment prefix, repository metadata, and
generated bundle metadata together. Re-running it with the same values is a
no-op; trying to change an initialized checkout fails instead of partially
renaming it.

Without GitHub CLI, clone the public template, replace its Git remote with your
own repository, then run the same `make init` command.

Install the current Wippy CLI from [Wippy releases](https://hub.wippy.ai/releases)
and use Node.js 22 or newer. Confirm both tools before starting:

```bash
wippy version
node --version
```

## Verification

`make verify` runs:

- resolves the module's public Wippy dependencies and installs the committed
  harness lock;
- installs the UI from `package-lock.json`;
- validates identity consistency, documentation links, dependency ranges,
  generated files, frontend registry metadata, and secret hygiene;
- tests the initializer itself in a disposable copy;
- runs Wippy lint;
- runs strict Vue/TypeScript checking and the production web-component build;
- boots the standalone harness on in-memory SQLite and runs every test.

PostgreSQL is a separate explicit matrix:

```bash
make postgres-up
make test-pg
make postgres-down
```

The Docker database is test-only and disposable. Production credentials never
belong in this repository.

## Publish to the Wippy Hub

Publishing requires a Wippy account with access to the organization selected
by `ORG`:

```bash
wippy auth login
wippy auth status
make release-check
make publish
```

`make publish` creates a private plugin by default and embeds the built UI.
To publish publicly:

```bash
make publish VIS=public
```

The source manifest does not pin a release version. The publisher selects the
next valid version; published releases remain immutable. Runtime dependencies
use compatibility constraints, while `wippy.lock` files carry exact resolved
artifacts for reproducible execution.

After publishing, install the module from Kickside's System → Hub page. The
host infers application-owned requirements; users are asked for
deployment-specific choices.

## Mount the module in a Kickside host

Bootstrap Kickside in a separate directory:

```bash
mkdir ../kickside-host
cd ../kickside-host
wippy run kickside/kickside -c --profile quickstart \
  --set vars.local_port=8090 \
  --set vars.local_public_api_url=http://localhost:8090
```

Publish and install the module once so it belongs to the host's locked graph.
Then create the untracked `../kickside-host/.wippy.workspace.yaml`:

```yaml
version: "1.0"
workspace:
  replacements:
    my-company/invoices: ../invoices
override:
  "app.env:defaults:values.GOV_MANAGED_NAMESPACES": "my_company.invoices"
```

Restart the existing host from its directory with the overlay:

```bash
wippy run --config .wippy.workspace.yaml -c --profile quickstart \
  --set vars.local_port=8090 \
  --set vars.local_public_api_url=http://localhost:8090
```

The host stays source-free: its lock and vendor packs belong to the deployment;
your module checkout is the only local source. Never add local replacements to
`wippy.lock` and never point Keeper's application filesystem sync at a
conventional module `src/` tree.

## Included vertical slice

The executable example is `acme/starter` until initialized:

- `acme.starter:definition` is the authoritative root `ns.definition`.
- `acme.starter:log` is a typed automation destination port.
- `acme.starter:log_sink` binds the shared `kickside.data:writable` contract.
- `acme.starter:log_write` validates and persists one acknowledged write.
- `acme.starter.persist:repo` owns SQL access.
- `acme.starter.migrations:01_create_log_entries` supports SQLite and Postgres.
- `acme.starter.api:get_status.endpoint` exposes authenticated module status.
- `acme.starter:starter_view` publishes an announced, auto-registered Wippy
  web component served by the module's own embedded filesystem.
- `test/` supplies an isolated host and behavioral/wiring suites.

Package identity (`organization/module`), registry namespace
(`namespace:name`), and component instance IDs are different identities. Do
not derive one from another. The root `ns.definition` declares the namespace.

## Repository map

```text
AGENTS.md                     development instructions
.kickside-module.json         initializer state and module identity
scripts/                      initializer and deterministic validation
wippy.yaml                    publish manifest; no fixed release version
src/                          registry declarations and Lua implementation
ui/                           source for the Wippy web component
static/                       generated, committed publish artifact
test/                         standalone Wippy harness and committed lock
compose.test.yaml             disposable PostgreSQL matrix
docs/kickside-development/    Kickside developer Wiki snapshot
.github/workflows/verify.yml  Linux SQLite + PostgreSQL + frontend CI
```

Start with [AGENTS.md](AGENTS.md), even when you are not using an agent. The
handbook begins at
[Developer Handbook](docs/kickside-development/developer-handbook.md); frontend
work begins at
[Frontend Handbook](docs/kickside-development/frontend/frontend-handbook.md).

## Rules

- Never commit credentials, `.env`, `.wippy/`, a root `wippy.lock`, module
  packs, `node_modules`, or source maps.
- Never put an exact resolved version in an `ns.dependency`; exact versions
  belong in lock files.
- Never infer a registry namespace from a package name. Read `ns.definition`.
- Never add compatibility fallbacks or duplicate ownership to hide a broken
  contract.
- Never manufacture actor scope. Execution inherits the calling actor.
- Never synchronously drive thread projections from a read endpoint.
- Build UI from `ui/src`; do not hand-edit `static/`.
- Use Wippy theme tokens and host APIs; no hardcoded deployment paths, raw
  proxy wires, fake `--p-*` colors, or unowned host styling.
- A change is complete only after SQLite, PostgreSQL, frontend, package, and
  secret checks pass in proportion to what changed.

## Documentation provenance

The bundled handbook is a public, offline-readable snapshot of the published
[Kickside Wiki](https://hub.wippy.ai/kickside/kickside/wiki/docs/kickside-development/developer-handbook.md).
The template repository is linked from that Wiki so agents can move between
the executable example and the current published guidance.
