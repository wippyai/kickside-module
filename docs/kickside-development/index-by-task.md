# Index By Task

- **Address an installed declaration**
  - **Use:** exact `namespace:name` from its root `ns.definition`
  - **Avoid:** deriving namespace from `vendor/module`
- **Find declarations of a type**
  - **Use:** `registry.find` by `.kind` + canonical `meta.type`
  - **Avoid:** titles, paths, or fuzzy runtime selection
- **Find/open a resource instance**
  - **Use:** actor-scoped component service
  - **Avoid:** searching the registry by `component_id`
- **List callable tools**
  - **Use:** `kickside.agents:tools` public catalog
  - **Avoid:** treating every Lua function as a tool
- **List executable Blocks**
  - **Use:** `kickside.blocks:blocks` normalized catalog
  - **Avoid:** executing raw unvalidated declarations
- **Add a user-owned resource**
  - **Use:** component kind + component service
  - **Avoid:** raw table with custom ACL
- **Add status/counts to a list**
  - **Use:** component public meta
  - **Avoid:** `get_stats` fallback endpoint
- **Add a provider**
  - **Use:** contract binding + registry entries
  - **Avoid:** central provider switch
- **Add provider credentials**
  - **Use:** private context or OAuth storage
  - **Avoid:** public meta
- **Add a workflow wait**
  - **Use:** thread event + trace context
  - **Avoid:** polling random tables
- **Add a human approval**
  - **Use:** inbox sink port
  - **Avoid:** custom approval table per feature
- **Add a file pipeline**
  - **Use:** uploads type/processor/artifacts
  - **Avoid:** direct file path handoff
- **Add KB ingestion**
  - **Use:** KB thread event + materializer contract
  - **Avoid:** direct engine writes from UI
- **Add graph enrichment**
  - **Use:** KB engine/store contract + worker
  - **Avoid:** provider-specific core branch
- **Add an automation**
  - **Use:** automation installable + ports + cron/projection
  - **Avoid:** new scheduler
- **Add a scheduled action**
  - **Use:** cron schedule targeting component action
  - **Avoid:** sleep loop service
- **Add a tool**
  - **Use:** `function.lua` with `meta.type=tool`
  - **Avoid:** untyped internal HTTP
- **Add a model provider**
  - **Use:** models provider adapter/profile
  - **Avoid:** vendored LLM patch
- **Add a page**
  - **Use:** `view.component` + `ui.nav_item`
  - **Avoid:** app shell hardcode
- **Add an admin setting**
  - **Use:** `kickside.settings:definition` entry
  - **Avoid:** env var only
- **Add a System page tab**
  - **Use:** `ui.settings_tab` + web component
  - **Avoid:** hardcoding into the shell
- **Add realtime list updates**
  - **Use:** `component.<id>` meta snapshot
  - **Avoid:** feature-specific list topic
- **Add delete cleanup**
  - **Use:** `kickside.contract:deletable`
  - **Avoid:** parallel delete endpoint
- **Add a stateless calculator**
  - **Use:** web component + nav item
  - **Avoid:** component/table unless needed
- **Add a saved workbook**
  - **Use:** component + private context + optional thread
  - **Avoid:** browser-only state
- **Add ERP records**
  - **Use:** component roots + module-owned tables
  - **Avoid:** component per tiny row
- **Add a db table**
  - **Use:** migration entry with postgres+sqlite blocks
  - **Avoid:** seed files (none exist)
- **Test a module**
  - **Use:** colocated `_test.lua` + `test/` harness
  - **Avoid:** testing only through the app
- **Develop against a live app**
  - **Use:** governance fs sync ([Dev Loop](14-dev-loop.md))
  - **Avoid:** rebuilding the app per change
- **Publish a module**
  - **Use:** version bump + `wippy publish` ([Publishing](15-publishing.md))
  - **Avoid:** publishing without a version bump

## Decision Tree

1. Is it owned/shareable/renderable/deletable?
   Use a component.

2. Does another module need to call it without knowing implementation?
   Define a contract and binding.

3. Does a builder need to discover it?
   Declare a registry entry or port.

4. Is it a durable workflow fact?
   Append a thread event.

5. Is it derived state?
   Build a projection/read model.

6. Is it time-based?
   Use cron.

7. Is it a finite deferred side effect?
   Use a job/worker.

8. Is it UI?
   Ship a web component and register a nav item.

9. Is it a large business module?
   Use component roots for access/lifecycle and module-owned tables for dense
   records. Add threads only where workflows/audit/waits matter.

For the lookup and context decision before any of these steps, follow
[Discovery, Addressing, And Context](19-discovery-addressing-and-context.md).
