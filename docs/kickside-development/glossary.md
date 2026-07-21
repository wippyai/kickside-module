# Glossary

Vocabulary is contract. Use one term for one concept in user-facing UI, registry
metadata, and module docs.

## Layer 1: User Surface

These are the words users see in the application.

- **Automation**
  - **Meaning:** Any configured ongoing behavior the app runs for a user.
  - **Retired Terms:** Flow as umbrella noun
- **Data Sync**
  - **Meaning:** Product name for the Data Sync kind in `platform/sync` (`kickside.sync`).
  - **Retired Terms:** Data Flow as product label
- **Data Flow**
  - **Meaning:** Generic pattern: an automation that moves data from a Source to a Destination.
  - **Retired Terms:** Sync flow when used as a product label
- **Block**
  - **Meaning:** One reusable typed capability inside a Flow.
  - **Retired Terms:** Behavior, workflow node
- **Flow**
  - **Meaning:** One executable DAG and its durable run state.
  - **Retired Terms:** Workflow engine
- **Workflow**
  - **Meaning:** A saved, versioned visual definition assembled from Blocks.
  - **Retired Terms:** Flow as the UI product
- **Channel Responder**
  - **Meaning:** An automation that responds in an external Channel.
  - **Retired Terms:** Responder alone when ambiguous
- **Source**
  - **Meaning:** Where a Data Flow reads items from.
  - **Retired Terms:** Trigger when describing a selectable input
- **Destination**
  - **Meaning:** Where a Data Flow writes items to.
  - **Retired Terms:** Sink in UI
- **Capability**
  - **Meaning:** An agent feature package the user can add or configure.
  - **Retired Terms:** Trait in UI
- **History**
  - **Meaning:** Past runs, events, or activity shown to users.
  - **Retired Terms:** Thread in UI
- **Chat**
  - **Meaning:** A user-facing agent session.
  - **Retired Terms:** Conversation, Thread
- **Channel**
  - **Meaning:** An external room such as Discord or Slack.
  - **Retired Terms:** Chat channel when it means the app session
- **Interval**
  - **Meaning:** A schedule that runs every N units.
  - **Retired Terms:** Ticker
- **Periodic**
  - **Meaning:** Human wording for interval-style schedules.
  - **Retired Terms:** Ticker
- **Cron**
  - **Meaning:** A cron-expression schedule.
  - **Retired Terms:** None
- **Once**
  - **Meaning:** A one-time schedule.
  - **Retired Terms:** One-shot

## Layer 2: Declaration Vocabulary

These are words module authors use in registry entries and contracts.

- **kind** — Registry entry kind, such as `contract.binding` or `view.component`.
- **module id** — Hub package identity in `vendor/module` form; not a registry namespace.
- **root namespace** — Namespace declared by a package's root `ns.definition`; never inferred from the module id.
- **entry id** — Exact static declaration identity in `namespace:name` form.
- **component id** — Durable instance/resource identity stored by the component service; not a registry entry id.
- **context** — Values supplied when opening a binding for one instance; only declared `context_required` values are ambient.
- **class** — Component/category class used for filtering and ownership.
- **block** — A `kickside.block/v1` declaration that lowers to one native Dataflow node.
- **port** — A named connection point: `data.block.ports` for Block results, or a standalone `kickside.automation.port` for Automation sources/Destinations.
- **dir** — Port direction: `in` for writable Destinations, `out` for Sources.
- **mode** — Port behavior such as `poll` or `trigger`.
- **via** — Port transport, commonly `thread` for event-backed trigger ports.
- **item_schema** — Source item shape shown to downstream wiring.
- **input_schema** — Destination input shape accepted by a writable port.
- **operations** — Destination operations such as `upsert` and `delete`.
- **output_schema** — Instance-owned output shape emitted by an automation.
- **events** — Thread-event ABI declared as `<module>.events:<noun>.<verb>`.
- **projection** — Worker/read model that folds events into state, public meta, or side effects.
- **public_state_schema** — Public meta fields an automation/component can render generically.
- **provision** — Declarative component initialization and teardown wiring.
- **trait** — Registry/code identifier for an agent Capability. Use Capability in UI.
- **Wippy Hub** — The package registry modules publish to and install from.
- **`kickside.sync`** — Data Sync module namespace.
- **`kickside.blocks`** — Headless Block validation, discovery, lowering, wait, and resume.
- **`kickside.workflows`** — Optional visual Workflow definition and lifecycle plugin.
- **`kickside.automation`** — Shared automation engine namespace; not a product kind.

## Layer 3: Engine Internals

These words are valid inside engine code and low-level docs.

- **component/thread one-id** — A component may use its id as its primary thread id.
- **thread** — Durable event log. Engine-only vocabulary, not a user-facing chat label.
- **actor/scope** — Security identity and bounded permission context.
- **frozen installer identity** — Captured actor context used by deferred automation work.
- **cursor** — Projection or sync position through an event/item stream.
- **backfill** — Initial historical drain before live operation.
- **drain** — Continue processing available backlog before returning to the user interval.
- **hop** — Trace-context loop budget count for event chaining.
- **sink** — Code term for a `dir:in` writable Destination. Do not show it to users.
- **source** — Code and UI term for a readable/pullable/triggering input.
- **channel hub** — Channel engine process that owns bridge routing and lifecycle.
- **realtime hub** — Per-user websocket fanout process; delivery topic `user.<user_id>`.
- **bridge** — Per-chat process that connects an inbound route to a `wippy.session`.
- **receive** — Provider-neutral inbound seam that normalizes external messages.
- **route_turn** — Internal operation that sends one normalized turn to the right bridge/session.

## Replacement Rules

- Conversation -> Chat.
- Thread -> History or Chat in UI; keep Thread only for the engine event log.
- Sink -> Destination in UI; keep sink only in code/ABI.
- Trait -> Capability in UI; keep trait only in registry/code identifiers.
- Channel -> external room only. Use Chat for the app's agent session.
- Ticker -> Interval or Periodic.
