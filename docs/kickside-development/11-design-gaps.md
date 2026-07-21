# Design Gaps And Watchpoints

This page is a review aid. It lists places where future work can accidentally
create parallel paths or muddy vocabulary.

## Public Meta Ownership

Target state:

```text
domain facts/storage -> one component-state owner -> component.set_meta
```

Watch for:

- domain workers recomputing counts and calling `set_meta`
- feature-specific `get_stats` endpoints used only to patch list cards
- retry/error paths stamping fake progress into public meta
- frontend surfaces subscribing to internal worker topics for list status

Corrective action: move the render snapshot to the component-state projection or
one explicit owner, and make frontend consume `component.<id>` full meta
snapshots.

## Realtime Topic Sprawl

Canonical list status topic:

```text
component.<component_id>
```

Feature-specific topics are acceptable only for internal/detail streams that are
not component public state. They should not be required to render generic
component lists.

## Component Granularity

Risk: making every domain row a component.

Rule: use components for lifecycle/access roots. Use module-owned rows for
high-volume records beneath those roots.

## Contract Granularity

Risk: shallow single-use contracts.

Rule: use a contract when decoupling or multiple implementations are real. Use a
module library for private helpers.

## Identity Paths

Target state:

- active operations use ambient actor/scope
- deferred workers run under reconstructed execution identity
- owner columns and actor columns are not conflated
- code uses actor APIs, not metadata aliases

Watch for helpers that accept actor arguments to impersonate users. Workers
should already be running under the right actor or should use an explicit
system/internal path.

## Upload And Content Access

Target state:

- app-internal callers use ambient access and owning APIs
- decoupled/external callers use signed upload/content tokens
- tokens carry minimal authority and correlation only
- UI origin metadata stays renderable but is not authority

Watch for direct storage URLs, broad token payloads, or KB code reading upload
tables directly.

## Frontend Coupling

Target state:

- app shell renders registry-declared surfaces
- modules ship their own web components
- lists render component public meta
- details call owning APIs

Watch for app shell imports of module UI, hardcoded provider lists, or frontend
storage joins.

## ERP-Scale Modeling

Target state:

- component roots for access/lifecycle
- module-owned tables for dense business records
- events for cross-component workflows
- projections/read models for dashboards
- ports for no-code builders

Watch for either extreme: one giant component blob with no domain tables, or a
raw table model with no component/access/workflow roots.

## Review Invariants

- Every list surface that displays component status consumes public meta.
- KB public meta has one authoritative state owner.
- Upload processors expose artifacts through upload contracts/APIs.
- Connection status is public meta when rendered in component lists.
- Inbox and automation compose ports with component meta; they do not define a
  second component or execution model.
