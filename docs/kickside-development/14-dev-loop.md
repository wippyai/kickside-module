# Dev Loop

Modules are developed against a live, Hub-installed Kickside application, not
against the Kickside monorepo. Keep two independent directories:

Start new work from the public
[wippyai/kickside-module](https://github.com/wippyai/kickside-module) template.
It contains the standalone harness, frontend contract, initializer, CI, and
this handbook.

```text
work/
  kickside-host/   # wippy.lock, .wippy/, machine-local runtime config
  acme-starter/    # the module's own git checkout
```

The host contains no Kickside source. Published application and dependency
packs live under `kickside-host/.wippy/`; the module checkout is loaded as a
machine-local workspace replacement.

## Run The Application

Create an empty host folder and bootstrap the application from the Hub once:

```bash
mkdir -p ../kickside-host
cd ../kickside-host
wippy run kickside/kickside -c \
  --profile bootstrap_admin --profile local --profile sqlite \
  --set vars.local_port=8090 \
  --set vars.local_public_api_url=http://localhost:8090 \
  --set vars.bootstrap_admin_email=<email> \
  --set vars.bootstrap_admin_password=<password>
```

This first invocation resolves the application graph, writes `wippy.lock`, and
materializes verified packs under `.wippy/vendor`. Preserve `wippy.lock`, the
whole `.wippy/` directory, and especially `.wippy/.env`: together they are the
deployment's dependency, history, data, and encryption state.

After bootstrap, stop using the module reference as an update mechanism. Normal
starts are lock-backed and local:

```bash
wippy run -c \
  --profile bootstrap_admin --profile local --profile sqlite \
  --set vars.local_port=8090 \
  --set vars.local_public_api_url=http://localhost:8090 \
  --set vars.bootstrap_admin_email=<email> \
  --set vars.bootstrap_admin_password=<password>
```

Bare `wippy run` reads the exact locked graph and does not resolve the Hub.
Dependency changes are explicit through Keeper's Hub UI/API or `wippy update`.
The published SQLite profile already supplies durable application and registry
history under `.wippy/`; do not add a second history configuration.

## Place The Module Source

Keep the module in its own repository. In the host folder create the untracked,
machine-local file `.wippy.workspace.yaml`:

```yaml
version: "1.0"

workspace:
  replacements:
    acme/starter: ../acme-starter

override:
  "app.env:defaults:values.GOV_MANAGED_NAMESPACES": "acme.starter"
```

`workspace.replacements` maps the published module identity to any local module
root; the directory name does not participate in module identity. The module's
root `ns.definition` remains authoritative for its registry namespace. The
workspace section is runtime-only and is never written to `wippy.lock` or
published. Do not add lock-file replacements; workspace replacements are the
only local-development mechanism.

The managed-namespace allow-list permits deliberate registry-side development
of this module without granting governance authority over Hub-owned Kickside or
Wippy namespaces.

Start the established deployment with the overlay:

```bash
wippy run --config .wippy.workspace.yaml -c \
  --profile bootstrap_admin --profile local --profile sqlite \
  --set vars.local_port=8090 \
  --set vars.local_public_api_url=http://localhost:8090 \
  --set vars.bootstrap_admin_email=<email> \
  --set vars.bootstrap_admin_password=<password>
```

Use the same config when inspecting or linting the assembled application:

```bash
wippy registry show acme.starter:definition --config .wippy.workspace.yaml
wippy lint --config .wippy.workspace.yaml --ns acme.starter --level error --no-color
```

## Managed Namespaces

Governance may only touch namespaces listed in `GOV_MANAGED_NAMESPACES`. The
workspace config above supplies the module namespace without changing the
published application.

Never include `app.deps`, `kickside`, `keeper`, `userspace`, or `wippy` merely
to make a sync succeed. A namespace belongs in the list only when its source is
owned by the sidecar checkout being edited.

## Keeper MCP

The governance tools are exposed over MCP at `/keeper-mcp/` (streamable HTTP
JSON-RPC):

1. Get an app bearer: `POST /api/public/user/token`.
2. Mint an MCP token: `POST /api/v1/keeper/mcp/tokens` with
   `{"label": "...", "preset": "root"}`.
3. The session exposes a small meta surface (`session_info`, `list_traits`,
   `describe_trait`, `use_trait`, `drop_trait`, `list_tools`, `call_tool`);
   registry tools are trait-gated, so activate a trait before its tools exist:
   `use_trait {ids:["keeper.agents.traits.state:editor"]}` unlocks
   `edit` / `abandon`.

Traits a module developer uses on a root session:

- **`keeper.agents.traits.state:explorer`**
  - **Tools:** `explore`, `get_entries`
  - **Use:** discover existing entries before writing
- **`keeper.agents.traits.state:editor`**
  - **Tools:** `edit`, `abandon`
  - **Use:** direct entry editing (see the registry loop below)
- **`keeper.agents.traits.state:publisher`**
  - **Tools:** `branch`, `push`
  - **Use:** publish a staged changeset
- **`keeper.agents.traits.inspect:test_runner`**
  - **Tools:** `run_test`, `test_endpoint`
  - **Use:** in-process tests and endpoint probes
- **`keeper.agents.traits.hub:operator`**
  - **Tools:** `hub_catalog`, `hub_dependencies`, `hub_migrations`
  - **Use:** install/uninstall modules, run migrations live
- **`keeper.agents.traits.components:builder`**
  - **Tools:** `fs`, `build_component`
  - **Use:** edit Keeper-managed frontend source and build a component
- **`keeper.agents.traits.components:ui`**
  - **Tools:** `ui`, `screenshot_ui`
  - **Use:** drive the app's browser session and capture screenshots
- **`keeper.agents.traits.git:reviewer`**
  - **Tools:** `rebuild`, `list_clusters`, `set_decision`, `push`, `pull_request`
  - **Use:** review and land changes as git commits/PRs

## Reactive Runtime Loop

The live registry accepts versioned changesets. Updating a registry entry's
definition or source through Keeper updates the running process without a
server restart. The module checkout remains the publish source; copy an
accepted live change into that checkout and run its tests before committing.

Activate the tools needed for direct work:

```json
{"ids":[
  "keeper.agents.traits.state:explorer",
  "keeper.agents.traits.state:editor",
  "keeper.agents.traits.state:publisher",
  "keeper.agents.traits.inspect:test_runner"
]}
```

The payload above is for `use_trait`. Clients that have not refreshed their
dynamic MCP tool list can invoke the tools below through `call_tool`.

Open a branch; `main` is not a direct-edit workspace:

```json
{"id":"keeper.state.tools:branch","arguments":{
  "action":"set","branch":"dev/acme-starter"
}}
```

Inspect exact runtime state before changing it:

```json
{"id":"keeper.state.tools:explore","arguments":{
  "operation":"namespace","name":"acme.starter","full":true
}}
```

```json
{"id":"keeper.state.tools:get_entries","arguments":{
  "ids":["acme.starter:log_write"],
  "include_source":true,
  "full":true
}}
```

Stage an anchored source or definition edit:

```json
{"id":"keeper.state.tools:edit","arguments":{
  "command":"str_replace",
  "path":"acme.starter:log_write",
  "old_str":"exact text from the inspected entry",
  "new_str":"replacement text"
}}
```

Creating an entry uploads its definition and optional code in one value:

```json
{"id":"keeper.state.tools:edit","arguments":{
  "command":"create",
  "path":"acme.starter:helper",
  "file_text":"<definition>\nname: helper\nkind: function.lua\nsource: file://helper.lua\n</definition>\n<source>\nreturn {}\n</source>"
}}
```

Apply the branch through governance:

```json
{"id":"keeper.state.tools:push","arguments":{
  "message":"Update starter log handler"
}}
```

A successful push replaces the affected live registry entries. Calls made
after the push use the new function source. A direct push does not run
migrations, tests, or frontend builds; run those operations explicitly. Use
`run_test` and `test_endpoint` from the test-runner trait for live verification.

### Frontend from the module checkout

The template's `acme.starter:ui_fs` is an `fs.directory` over `./static`, and
`acme.starter:ui_static` serves that filesystem. After the workspace
replacement has been mounted, run the UI build watcher in the module checkout:

```bash
cd ui
npm install
npm run dev
```

The watcher writes each build into `../static`. Reload the browser to fetch the
new bundle. The Wippy process does not need a restart while `ui_fs`, the static
route, `tag_name`, `base_path`, and `entry_point` remain unchanged. Changes to
those registry declarations can be applied through the registry branch above,
or loaded from the checkout on restart.

### Frontend through Keeper's project filesystem

Keeper's `fs` tool operates on frontend source exposed by the application
project filesystem under `frontend/...`. It is separate from a standalone
module checkout's `ui/` directory. Activate
`keeper.agents.traits.components:builder`, open a branch, then stage one file
operation per call:

```json
{"id":"keeper.components.tools:fs","arguments":{
  "command":"view",
  "path":"frontend/applications/example/src/App.vue"
}}
```

```json
{"id":"keeper.components.tools:fs","arguments":{
  "command":"str_replace",
  "path":"frontend/applications/example/src/App.vue",
  "old_str":"exact inspected text",
  "new_str":"replacement text"
}}
```

`keeper.state.tools:push` flushes those staged files. For direct work, invoke
the build explicitly after the push:

```json
{"id":"keeper.components.tools:build_component","arguments":{
  "component_id":"@example/app-example",
  "wait":true,
  "timeout_s":180
}}
```

Task-driven integration may run builds as an integration handler. Direct
`keeper.state.tools:push` does not.

## Find A Real Example First

The ecosystem already contains working modules for almost every shape: provider
connections, automation kinds, KB engines, UI surfaces, traits. Before
authoring anything, locate one and read its actual entries — never reconstruct
a registry shape from memory. If no example can be found, the shape is a guess;
stop and find one.

Over the hub tools (trait `keeper.agents.traits.hub:operator`):

```json
{"action": "browse", "query": "telegram"}          // hub_catalog: search components
{"action": "readme", "component": "kickside/telegram"}
{"action": "versions", "component": "kickside/telegram"}
{"action": "list", "include_entries": true}        // hub_dependencies: installed graph, per-entry ids/kinds/comments
{"action": "plan", "component": "kickside/discord", "include_entries": true}
```

`hub_dependencies list` with `include_entries` returns every installed module's
entries with kinds and comments — a full worked example of any pattern already
running in the app. `plan` shows what a not-yet-installed module would add
without installing it. Installing an example module to study it is also fine;
uninstall it after.

Over the state tools (traits `keeper.agents.traits.state:explorer`):

```json
{"operation": "search", "attributes": {"meta.type": "agent.trait"}}
{"operation": "namespace", "root": "kickside.telegram"}
{"operation": "entries", "ids": ["kickside.telegram:connection"]}
```

The registry is the ground truth: an entry fetched from a running app is a
verified example; a shape recalled from training data is not. Building an OAuth
connection starts with reading an installed provider's connection binding, not
with writing YAML from scratch.

## The Filesystem Sidecar Loop

1. Edit the module repository's canonical `src/` tree.
2. Run its standalone lint and test harness (page 13).
3. Stop and restart the host with `--config .wippy.workspace.yaml`. Restart
   reads the changed replacement from disk without resolving or changing the
   locked Hub graph.
4. Exercise the assembled module through the UI, API, or Keeper test tools.

Do not point `keeper.gov:source_fs` directly at a conventional module's `src/`
tree. Keeper's filesystem serializer uses application-style,
namespace-derived paths (`src/acme/starter/**`), while the publishable module
layout begins at `src/_index.yaml`. Mixing those layouts creates a second copy
of the same registry entries. `sync_from_fs` / `sync_to_fs` remain correct for
host-owned application source, but they are not the sidecar transport.

## The Registry Loop (No Filesystem)

An agent without filesystem access to the run folder works through the state
tools instead of files. Entries are addressed as `namespace:name`; each carries
a YAML definition and an optional source body:

```json
{"command": "view", "path": "acme.starter:log_write"}
{"command": "str_replace", "path": "acme.starter:log_write",
 "old_str": "exact text", "new_str": "replacement"}
{"command": "create", "path": "acme.starter:helper",
 "file_text": "<definition>\nname: helper\nkind: function.lua\nsource: file://helper.lua\n</definition>\n<source>\nreturn {}\n</source>"}
```

Each `edit` stages one operation on the active branch changeset; `push`
publishes registry changes and flushes staged project-frontend files;
`abandon` discards the changeset. Registry edits are live and versioned, but
they do not write into the sidecar checkout. Port the accepted change into the
module's canonical source and verify it through the filesystem sidecar loop
before committing or publishing.

Which loop to use: with filesystem access to the module checkout, use real
files, git, ordinary editors, and a lock-backed restart as the assembly step.
Without it (a remote agent, or an agent living inside the app), the registry
loop supplies state editing, frontend builds, migrations, tests, and UI
screenshots; the resulting source still has to be reconciled into the module
repository before publishing.

## Dependencies On Installed Modules

A module's `ns.dependency` declarations stay in its `_index.yaml` so the same
source tree resolves standalone (`wippy update`, publish). When the running app
already installs the declared component, the duplicate declaration folds into a
recorded reference on the dependency resolution instead of conflicting — the
app's declaration keeps controlling install/uninstall, the module's declaration
joins the constraint solve and is verified against the selected version. This
requires a runtime with the reference fold (runtime PR #501 or later); on older
runtimes the duplicate declaration conflicts with
`dependency component "X" is already installed`.

## Migrations

Syncing a migration entry registers it; running it is a separate step. On an
instance with the keeper hub tools, run migrations live over MCP:

```json
{"action": "list"}
{"action": "run", "operation": "up", "component": "acme/starter", "dry_run": true}
{"action": "run", "operation": "up", "component": "acme/starter"}
```

(`hub_migrations`, trait `keeper.agents.traits.hub:operator`; `dry_run` first
when the selection is broad.) Without those tools, migrations run at boot —
restart the app after adding or changing them.

## What Still Needs A Restart

- Changes to runtime configuration (profiles, overrides, managed namespaces).
- Adding, removing, or retargeting a workspace replacement.
- Registry definitions or Lua source changed only on disk inside a workspace
  replacement, unless the equivalent entry change was applied through Keeper.
- Runtime binary upgrades.

Files served by an existing `fs.directory` do not require a restart. Rebuild
the files and reload the consuming page. A restart is required when the
`fs.directory` or its routing declarations change only in the local YAML.

First-boot note: the setup wizard can be skipped server-side with
`POST /api/v1/ui/splash/welcome/seen`.

## Standalone Resolution

The same module folder resolves without the app: run `wippy update` inside the
module directory to resolve its declared dependencies, and the harness under
`test/` boots the module in isolation (see [Testing](13-testing.md)). The dev
loop and standalone resolution work from one source tree; nothing is forked to
switch between them.
