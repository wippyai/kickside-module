# Testing

Every module proves itself two ways: colocated unit tests next to the source
they cover, and a standalone harness under `test/` that boots the module in
isolation and runs every suite against both SQLite and Postgres. Tests are
registry entries; the vendor `wippy/test` module supplies the runner and
assertion API. Backticked paths cite the Kickside monorepo (oauth is the
reference harness); the examples are complete on their own.

## Test Entry Shape

A test is a `function.lua` entry with `meta.type: test`, a `suite`, an import
of the vendored test lib, and a `method` (conventionally `run`). Verbatim from
`core/contract/test/_index.yaml`:

```yaml
- name: contract_smoke_test
  kind: function.lua
  meta:
    type: test
    suite: kickside_contract
    comment: Ensures the base contract definitions load with method surfaces.
  source: file://contract_smoke_test.lua
  modules: [registry]
  imports:
    test: wippy.test:test
  method: run
```

`meta.type: test` excludes the entry from publish (every manifest carries
`exclude_meta.type: [test]`, page 15). `meta.suite` groups cases; optional
`meta.group` groups suites in the runner UI. `modules:` lists runtime modules
the body requires; `imports:` maps aliases to registry entry IDs.

## Test File Body

The Lua file `require`s its declared imports by alias, defines cases with
`test.describe`/`test.it`, and exports the `run_cases` wrapper. Skeleton from
`core/contract/test/contract_smoke_test.lua`:

```lua
local test = require("test")
local registry = require("registry")

local function define_tests()
    test.describe("kickside.contract packaging", function()
        test.it("publishes every base contract definition with methods", function()
            local entry, err = registry.get("kickside.contract:deletable")
            test.is_nil(err)
            test.not_nil(entry, "deletable is missing")
            test.eq(entry.kind, "contract.definition")
        end)
    end)
end

local run_cases = test.run_cases(define_tests)
return { run = function(options) return run_cases(options) end }
```

Assertion API: `test.eq(actual, expected, msg?)`, `test.not_nil`,
`test.is_nil`, `test.is_true`. The entry's `method: run` calls the exported
function, and that export must execute the defined cases.
`test.run_cases(define_tests)` is the canonical shape: its returned function
registers the describes, runs them, and emits the per-case events the suite
runner counts. Warning: `test.describe`/`test.it` only register cases. An
export that defines describes without the `run_cases` wrapper - a bare `run`
returning `{ run = run }`, as in `platform/inbox/src/sink/sink_test.lua` -
never executes an assertion; the runner sees zero case events and records the
entry as a single green pass. Do not copy that shape.

## Test Placement

- **Unit tests** — Colocated as `<file>_test.lua` next to the source they prove
- **Test-only registrations (stubs, probes, fixtures, test procs)** — The module's `test/src/` harness
- **Conformance kits for third-party implementers** — `src/testing/` - product API, not harness scratch

## The Standalone Harness

Each module carries a runnable harness under `test/` - itself a tiny Wippy
module, distinct from the module under test - that provides the host resources
the module's `ns.requirement` slots expect, boots the dependency graph, and
runs the colocated suites. Four files matter (reference: `platform/oauth/test/`):

- **`test/wippy.yaml`** — Names the harness module
- **`test/wippy.lock`** — Pins deps; points kickside deps at on-disk siblings; loads `../src`
- **`test/src/_index.yaml`** — Host resources + bootloader wiring + boot gate
- **`test/.wippy.yaml`** — Profile matrix (Postgres override)

### `test/wippy.yaml`

```yaml
organization: kickside
module: oauth-harness
description: Standalone runnable harness that boots kickside/oauth (and its component/contract/cron/views deps) and runs its co-located *_test.lua suites.
```

The `-harness` suffix keeps it a separate package; it is never published.

### `test/wippy.lock`

The harness lockfile is committed (unlike module-root lockfiles).
`directories.src: ../src` loads the module under test directly, so its
colocated `*_test.lua` entries are included; `replacements` point kickside
dependencies at on-disk sibling directories instead of the Hub. Excerpt from
`platform/oauth/test/wippy.lock`:

```yaml
directories:
    modules: .wippy
    src: ../src
modules:
    - name: kickside/contract
      version: 0.1.10
    - name: kickside/oauth-harness
      version: 0.1.0
      root: true
    - name: wippy/bootloader
      version: 0.3.12
    - name: wippy/test
      version: 0.4.12
replacements:
    - from: kickside/contract
      to: ../../../core/contract
    - from: kickside/oauth-harness
      to: .
options:
    unpack_modules: true
```

When authoring outside the monorepo, drop the `replacements` and let the lock
resolve published kickside modules from the Hub.

The `root: true` self-entry loads the harness module's own `test/src`
resources; a harness with real wiring fails to link without it (every
requirement reports `no dependency parameter found`). `wippy update` rewrites
the lock without the self-entry - restore it after updating.

### `test/src/_index.yaml`

Namespace `app`. It provides the concrete host resources every module
requirement defaults to, then wires them through a `wippy/bootloader`
`ns.dependency` whose `parameters` map requirement slots to those resources.
Condensed from `platform/oauth/test/src/_index.yaml`:

```yaml
version: "1.0"
namespace: app

entries:
  - name: db
    kind: db.sql.sqlite
    file: ":memory:"
  - name: env_storage
    kind: env.storage.file
    meta: { type: envstorage }
    file_path: ./.wippy/test.env
    auto_create: true
  - name: processes
    kind: process.host
    lifecycle: { auto_start: true }
  - name: gateway
    kind: http.service
    addr: :19113
    lifecycle: { auto_start: true }
  - name: api
    kind: http.router
    meta: { server: gateway }
    prefix: /api
  - name: api.public
    kind: http.router
    meta: { server: gateway }
    prefix: /api/public
  - name: user
    kind: security.policy
    groups: [oauth_test]
    policy: { resources: '*', actions: '*', effect: allow }
  - name: oauth_harness.dep.contract
    version: "*"
    kind: ns.dependency
    component: "kickside/contract"
  - name: oauth_harness.dep.bootloader
    version: "*"
    kind: ns.dependency
    component: "wippy/bootloader"
    parameters:
      - { name: wippy.bootloader:application_host, value: app:processes }
      - { name: wippy.bootloader:env_storage, value: app:env_storage }
      - { name: wippy.migration:app_db, value: app:db }
      - { name: kickside.oauth:target_db, value: app:db }
      - { name: kickside.oauth.security:user_security_scope, value: app.security:user }
```

The real file declares one such `ns.dependency` per transitive kickside dep
(component, cron, core, views). Rules that make this work:

- The bootloader dependency's `parameters` map each module's `ns.requirement`
  entries (`target_db`, `user_security_scope`, `api_router`, ...) to harness
  resources; `wippy.migration:app_db -> app:db` makes migrations run against
  the harness database at boot.
- The module under test loads via `directories.src: ../src`, so its own
  requirement defaults resolve against the harness resources without an
  explicit `ns.dependency` for it. Do not add one: wiring the same requirement
  from two places clobbers the target entry.
- Harness-only entries (stubs, probes, fixtures) live here in `test/src/`,
  never in the module's `src/`.

### The Boot Gate

Migrations apply asynchronously at boot, so a `wait_for_boot` test in
`suite: "00_setup"` gates every other suite until the module's tables exist:

```yaml
- name: wait_for_boot
  kind: function.lua
  meta: { type: test, suite: "00_setup" }
  source: file://wait_for_boot.lua
  modules: [sql, time]
  method: run
```

The body polls `sql.get("app:db")` for a marker table - `pg_tables` first,
falling back to `sqlite_master` so one gate works on both engines - and errors
after a bounded number of attempts (the oauth gate polls 300 times at 100ms).

## The SQLite + Postgres Matrix

The default database is in-memory SQLite (`app:db` above). `test/.wippy.yaml`
adds a `postgres` profile that overrides the same entry onto Postgres. Verbatim
from `platform/oauth/test/.wippy.yaml`:

```yaml
version: "1.0"
vars:
  pg_host: localhost
  pg_port: 5433
  pg_database: kickside_test_oauth
  pg_username: kickside
  pg_password: kickside
profiles:
  postgres:
    override:
      "app:db:kind": db.sql.postgres
      "app:db:host": "${pg_host}"
      "app:db:port": "${pg_port}"
      "app:db:database": "${pg_database}"
      "app:db:username": "${pg_username}"
      "app:db:password": "${pg_password}"
      "app:db:options.sslmode": disable
      "app:db:pool.max_open": 16
      "app:db:pool.max_idle": 8
```

`pg_database` must be unique per module, named `<org>_test_<module>`
(`kickside_test_oauth`, `acme_test_starter`), so harnesses never collide on a
shared Postgres server. Postgres is stricter than SQLite; the
matrix catches UUID literal handling, `strftime` defaults, and similar gaps.

## Running Tests

```sh
cd test && wippy run test                     # sqlite (default)
cd test && wippy run test --profile postgres  # postgres profile
```

Each module's `Makefile` codifies the default as its `test` target
(`cd test && wippy run test`). A module is not done until both profiles pass.

## Harness Limits

- Kickside module requirements have no usable defaults in a standalone
  harness: every `ns.requirement` of every transitive kickside dependency must
  be wired through bootloader `parameters`. The practical procedure is to copy
  a real harness (`platform/oauth/test/`) and extend it - run
  `wippy run test`, wire the slot behind each "parameter not found" or link
  error, repeat until boot passes.
- Test code runs without an ambient security actor or scope. Kickside core
  paths that require one - thread emit, contract opens under scope - cannot be
  exercised from the standalone harness. Success paths that emit thread events
  are tested against a live app through the dev loop's `run_test`
  ([14-dev-loop.md](14-dev-loop.md)) instead.

## Migrations

Tests depend on migrations: the harness boots them before the gate opens, so
authoring them correctly is part of testing.

### Migration Entry

A migration is a `function.lua` entry with `meta.type: migration`, a
`meta.target_db`, a `meta.timestamp`, and an import of the vendored runner.
From `platform/oauth/src/migrations/_index.yaml` (namespace
`kickside.oauth.migrations`; the real entry also carries a `meta.tags` block,
trimmed here):

```yaml
- name: 01_create_oauth_connections_table
  kind: function.lua
  meta:
    type: migration
    comment: Create kickside_oauth_connections table for OAuth connection and token storage
    target_db: app:db
    timestamp: "2025-06-22T12:00:00Z"
  source: file://01_create_oauth_connections_table.lua
  imports:
    migration: wippy.migration:migration
  method: migrate
```

Files are named `NN_description.lua`; exactly one `migrations/` directory per
module. Non-contiguous numbering is legal only as the applied-migration-move
exception (page 12).

### Migration Body

Each file returns `require("migration").define(...)` with one `database` block
per engine, each carrying `up`/`down`. Both engines are mandatory - the dual
blocks let the harness matrix run the same module on SQLite and Postgres.
Skeleton from `platform/oauth/src/migrations/01_create_oauth_connections_table.lua`:

```lua
return require("migration").define(function()
    migration("Create kickside_oauth_connections table", function()
        database("postgres", function()
            up(function(db)
                local _, err = db:execute([[
                    CREATE TABLE kickside_oauth_connections (
                        id UUID PRIMARY KEY,
                        created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
                    );
                ]])
                if err then error("Failed to create table: " .. err) end
            end)
            down(function(db) db:execute("DROP TABLE kickside_oauth_connections") end)
        end)
        database("sqlite", function()
            up(function(db)
                local _, err = db:execute([[
                    CREATE TABLE kickside_oauth_connections (
                        id TEXT PRIMARY KEY,
                        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
                    )
                ]])
                if err then error("Failed to create table: " .. err) end
            end)
            down(function(db) db:execute("DROP TABLE kickside_oauth_connections") end)
        end)
    end)
end)
```

Engine-specific SQL diverges deliberately: `UUID` and `BIGINT` on Postgres map
to `TEXT` and `INTEGER` on SQLite; timestamp defaults use `to_char(now() ...)`
versus `strftime(...)`.

### Wiring `target_db`

The harness satisfies a module's `target_db` requirement through bootloader
`parameters` (`kickside.<module>:target_db -> app:db`); `wippy.migration:app_db`
tells the runner which database to migrate. The `ns.requirement` /
`ns.dependency` idioms behind those slots are in
[16-conventions.md](16-conventions.md#dependencies-and-wiring).

### No Seeds

There is no seed mechanism. Shipped defaults are `registry.entry` catalog
records, not database rows - the models module ships static `llm.model`
entries in its catalog namespace and inserts nothing into the database by
default. Declare default data as registry entries; do not invent a seed
migration.
