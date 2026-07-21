# Application Patterns

The same primitives should support a small calculator, a data-flow workflow, and
a large ERP/CRM module. The difference is granularity, not a different
architecture.

## Decision: App Surface Or Component?

Start with this question:

- **Pure UI, no durable per-user resource** — `view.component` + `ui.nav_item`
- **User saves/share/deletes a thing** — component kind
- **Thing owns many internal records** — component root + module-owned tables
- **Thing produces workflow facts** — component primary thread + events
- **Thing has list status/counts** — component public meta
- **Thing has private config** — component private context
- **Thing talks to external service** — connection/provider contract
- **Thing plugs into workflows** — declared ports

Do not make every database row a component. Make a row a component when it needs
component guarantees: ownership, sharing, placement, public meta, teardown, or
module-level actions.

## Tiny Calculator

If the calculator is just a utility:

- ship one web component
- register one `view.component`
- register one `ui.nav_item`
- keep all state in the browser
- no component row
- no migrations
- no thread

This is enough for a stateless calculator page.

## Saved Calculator / Workbook

If users can save calculators, share them, or reopen runs:

- create a calculator component kind
- public meta: `title`, `class = calculator`, `status`, `last_result`
- private context: formula/options/default units
- module-owned table: calculation runs if history is large
- primary thread: durable run events if runs feed automation
- projection: update public meta and optional read model
- web component: list/detail UI through API + component meta

Events might be:

```text
calculator.run.requested
calculator.run.completed
calculator.run.failed
```

The calculation engine can be a contract if multiple engines or providers are
expected. Otherwise it can be a module library.

## Workflow / Data-Flow App

A visual Workflow builder is an optional product surface over the canonical
Block catalog. Nodes resolve exact `kickside.block/v1` declarations; publishing
freezes a validated version and compiles it to a native Dataflow DAG. Definition
events are authoritative and relational definition tables are projections.
Automation ports separately expose ongoing trigger sources and Destinations.
See [Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md).

## ERP / CRM / SAP-Style Module

A large business module should usually be one module with several component
roots and module-owned tables.

Example CRM:

- **CRM workspace/account** — component
- **Pipeline** — component if independently shared/configured; otherwise row
- **Contact** — row unless it has independent ACL/lifecycle
- **Company/account** — component only if shared/configured/deleted independently
- **Deal** — component if it owns workflows, documents, access, or public status
- **Deal line item** — row
- **Activity/event** — thread event or row, depending on durability/audit needs
- **Dashboard card status** — component public meta or read model
- **Approval** — inbox item + correlated events
- **External email/calendar** — connection provider

Use components as lifecycle/access roots. Use normal SQL tables for high-volume
domain records under those roots.

## Domain Tables

Module-owned tables are correct for:

- high-cardinality records
- engine internals
- search indexes
- graph nodes/edges
- immutable history optimized for queries
- provider caches

But access should enter through the owning component or contract. A frontend or
other module should not join directly into those tables.

## Threads In Large Modules

Use one thread per durable process or aggregate that needs event semantics.

Examples:

- deal negotiation
- purchase-order approval
- incident response timeline
- KB source ingestion
- agent conversation/session
- invoice processing run

Do not force every CRUD update into a thread if the module only needs a simple
row update. Use threads where audit, projection, waits, or cross-component flow
matters.

## Public Meta In Large Modules

Public meta should stay small and list-friendly:

```lua
{
  status = "active",
  open_count = 12,
  overdue_count = 2,
  last_activity_at = "...",
}
```

Large dashboards should use read models and APIs. Public meta is for component
cards, nav badges, and quick render state.

## When To Split Modules

Split when one of these becomes true:

- another app should install the capability independently
- the module exposes a stable provider contract
- the module has its own storage lifecycle
- the module has independent tests/publish cadence
- the module ships module-owned web components intended for reuse

Do not split just because a file is big. First factor libraries inside the owning
module.
