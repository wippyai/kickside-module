# Threads, Events, And Projections

Threads are the durable workflow substrate. Events are facts. Projections turn
facts into read models, component public meta, and side effects. Use threads
when a process is transitive, asynchronous, auditable, or waits on another
component.

The author surface is the `kickside.core:threads` contract (monorepo
`core/core/src/threads/contract.lua`); every method returns `(result, error?)`
with typed errors `INVALID`, `CONFLICT`, `NOT_FOUND`, `PERMISSION_DENIED`.

## Event Log First

A workflow such as KB ingestion is modeled as events: `kb.ingest.requested` →
`kb.content.upserted` → `kb.digest.requested` → `kb.digest.completed` →
`kb.ingest.completed`. The UI does not infer durable state from transient
realtime notifications: realtime wakes the UI up, but the source of truth is
the event log and its read models.

## Emitting Events

The law: a component's thread IS addressed by the component id — `thread_id ==
component_id`, enforced, not a convention. `emit`, `purge`, and `ensure_thread`
treat the two as the same value and reject calls that supply neither; never
pass a "discovered" thread id different from the component id.

`emit` is the canonical append: it lazily ensures the component's thread exists
(idempotent; first touch applies the kind's declared projections and retention
via `impl_id`), then appends. Bind an actor and scope first — an emit without
them does not land (see Gotchas).

```lua
local def  = contract.get("kickside.core:threads")
local inst = def:with_actor(actor):with_scope(scope):open()
inst:emit({
  component_id = component_id,           -- == thread id
  type         = "kickside.sync.events:run.started",
  body         = { started_at = now_iso(), reconcile = true },
  impl_id      = "kickside.sync:sync",   -- drives declared projection/retention autoinit
  thread_class = "automation",
})
```

### Lower-Level Appends

- **`append_event({ thread_id, event = {...} })`** — Single event convenience
- **`append_events({ thread_id, events })`** — Batch append to one thread
- **`append_events({ writes = [{thread_id, events}, ...] })`** — Append across several threads atomically in one transaction

The writer owns sequencing, dedupe, the per-thread access gate, cursor
stamping, and ordered locking. Per inserted batch it emits an `events.appended`
thread update; `wake_scheduler = true` also nudges the projection runner.
Event fields: `id`, `seq`, `type`, `role` (default `"system"`),
`body`/`body_json`, `content`, `external` (`{ external_source, external_id,
external_version }` for idempotent dedupe), `trace_context`, `created_at`;
structured `body` is JSON-encoded for you.

### Creating Threads

- **`create`** — Component-first: registers the component, writes the thread row under the same id, emits `kickside.threads:thread.created`. Returns `{ thread_id, thread, component_id, rollback }`.
- **`ensure_thread`** — Attach a thread to an already-existing component id; idempotent get-or-create used on the hot emit path.
- **`upsert`** — Idempotent by natural key: explicit `thread_id`, else a deterministic id derived from `(thread_class, external_ref)` via HMAC-SHA256. A repeat upsert by the same key returns the same thread. `external_ref` is consumed into `attrs`, not stored as a column.

### HTTP Surface

Thin adapters over the same contract (`core/core/src/threads/api/_index.yaml`):
`POST /threads`, `GET/PATCH/DELETE /threads/{id}`, `GET /threads`,
`POST/GET /threads/{id}/events`, `POST /threads/{id}/events/batch`,
`POST /threads/{id}/messages`, `GET /threads/{id}/children`,
`GET /threads/{id}/graph`. The acting actor comes from the security context.

## Trace Context

One `trace_context` object rides every event, as columns:

- **`trace_id`** — Cross-run lineage
- **`run_id`** — One executable run or workflow attempt
- **`caused_by_event_id`** — Parent event id
- **`correlation_key`** — Domain key for waits and dedupe, e.g. `kb:<id>:source:<source-id>`

Waits query on `run_id` + `type` + `correlation_key`. Do not create
`workflow_id`, `operation_id`, `request_id`, `process_id`, or module-specific
trace aliases unless the concept is genuinely different. When appending events
from a projection, explicitly set `trace_context`; core may inherit only when
the batch has one unambiguous trace.

## Declaring Projections

Two ways, both landing in the same engine (`core/core/src/projections/`).

### Declaratively (Normal Author Path)

In the component/automation binding's `meta.projections` block, as in the Data
Sync binding (`platform/sync/src/_index.yaml`):

```yaml
projections:
  - kind: "kickside.sync:status"
    worker_ref: "func://kickside.sync:sync_projection_worker"
    input_mode: prefetch_events
```

When the thread is first ensured (any `emit` with the matching `impl_id`), the
writer auto-registers this declaration. Declared projections refuse to register
without a reconstructable execution identity — the first-touch actor is frozen
as the projection owner (see Execution Identity).

### Imperatively

Via contract method `register_projection` (WRITE-gated on the thread; captures
an execution identity for `"projection"`) or HTTP
`POST /threads/{id}/projections`. Accepted fields:

```text
kind, projection_key, cursor_key, coalesce_key, batch_size, start_seq, reset,
worker_ref, worker_input_mode, worker_config, events,
window_max_events, window_idle_timeout_ms, window_max_duration_ms
```

`worker_ref` is a URI validated against the registry: `func://<id>` runs a
`function.lua` synchronously; `proc://<id>` runs a supervised `process.lua`.
The runtime must match the target's registry kind; daemon procs (scheduler,
job worker) are blocked as workers.

### Addressing And Cursors

A projection is addressed by `(thread_id, kind, projection_key)`; a cursor by
`(projection_id, cursor_key)`; both keys default to `"default"`. Cursor
statuses: `pending → running → live | caught_up`, plus terminal
`failed`/`paused`/`invalid`. Input modes: `prefetch_events` (runner selects and
passes rows) or `cursor_only` (default; worker reads its own).

## The Worker Input Envelope

A projection worker's `run(input)` receives:

```lua
{
  thread_id = ...,                 -- == component id
  trace_context = ...,             -- common trace of the batch
  worker_input_mode = "prefetch_events" | "cursor_only",
  cursor     = { id, cursor_key, last_seq, target_seq, batch_size, generation },
  projection = { id, kind, body }, -- body = the current fold state
  range      = { from_seq, to_seq, target_seq, processed_count },
  events     = { ... },            -- present only in prefetch_events mode
}
```

Each event row carries `id`, `seq`, `type`, `role`, `body` (decoded to a
table), `created_at`, the `external_*` fields, and the trace columns.
Projection code acts under the projection's registered actor identity; workers
do not manually pass user ids around to secured helpers.

## Projection Outputs

A projection usually updates a read model, appends a new durable event, updates
component public meta, enqueues a job, or calls a bounded side-effect contract.
The return `{ body, last_seq }` persists the new fold state and advances the
cursor. The complete real example is monorepo
`platform/sync/src/persist/sync_projection.lua`:

```lua
function M.run(input)
  local projection = input.projection or {}
  local body = projection.body or {}              -- current fold state
  for _, ev in ipairs(input.events or {}) do apply(body, ev) end
  local ok, err = sync_public_meta(input, body)   -- push to component
  if not ok then return nil, err end
  return { body = body, last_seq = input.range.to_seq }
end
```

## Component State Projection

Thread events fold into component public meta through one component-state
projection that calls `component.set_meta` — the pattern is specified in
[Component Development](01-component-development.md#public-meta-projection-pattern).
`sync_public_meta` above is that pattern applied: the projection is the single
owner of the rendered counts/status (`component_id == input.thread_id`), and
domain workers do not compute them in parallel.

## Read-After-Write

`catch_up_projection({ thread_id, kind, projection_key?, max_ticks? })`
synchronously advances one cursor through the catch-up engine (up to
`max_ticks`, default 20). Use it when a component's public read model must
reflect a just-appended event before responding — never replay events by hand.
Lifecycle control: `pause_projection` / `resume_projection` /
`remove_projection`, all WRITE-gated; `attach`/`detach` are acknowledgement
no-ops — registration already IS the binding.

## Jobs

Jobs are deferred/finite side effects on a leased durable queue
(`core/jobs/src/jobs.lua`, surface `kickside.core.jobs:jobs`): `enqueue`,
`cancel`, `still_running`.

```lua
jobs.enqueue({
  thread_id, job_type,           -- job_type is the dispatch key
  worker_ref,                    -- optional func://<id> or proc://<id> generic worker
  concurrency_key, idempotency_key,
  payload,                       -- arbitrary JSON
  queue_tier = "live" | "backfill" | "maintenance",  -- default drains live first
  priority, max_attempts,
  scheduled_at,                  -- defer until a timestamp
  trace_context,
  actor_id, actor_context,       -- frozen execution identity
  thread_event,                  -- append this event atomically with enqueue
})
```

The `thread_event` parameter is the idempotency seam: the job row and the
thread event are written in one transaction, then the thread is woken. "Record
the fact and schedule the work" is atomic only through this path.

Job lifecycle: `pending → running → done | dead | cancelled`. Built-in job
types: `effect.intent.execute`, `event.content.hydrate`. A job with a
`worker_ref` executes under its stored `actor_id` + `actor_context`. Projection
catch-up is not a job type — the scheduler drives it directly. Config knobs are
code defaults with env override (lease timeout 45s, max attempts 3, worker pool
sized by database backend).

## Cron

Cron is time-driven (`core/cron/src/`). An author implements the
`kickside.cron:schedulable` contract (one method, `execute`) and calls
`kickside.cron:scheduler.create`:

- **`task_implementation_id`** — Required. The schedulable impl to run
- **`schedule_type`** — Required. `interval` \| `once` \| `cron` \| `ticker`
- **`schedule_expression`** — Required. Duration for interval/ticker, ISO datetime for once, cron pattern for cron
- **`task_context`, `task_args`** — Payloads handed to `execute()`
- **`class`** — `user` \| `system` \| `component`
- **`run_actor_id`** — Optional. Actor id for live runtime scope resolution
- **`timeout_seconds`, `max_retries`, `enabled`** — Defaults 3600, 3, true

`execute` receives `{ schedule_id, previous_runs = { last_run_at,
consecutive_failures, retry_count, last_error }, args }` and returns
`{ success, error?, retriable?, retry_after_ms? }`. Schedule statuses:
`scheduled`/`executing`/`completed`/`failed`/`disabled`.

Doctrine: jobs for deferred execution, cron for time; automation owns install
state, source selection, actions, and rollback. Do not put timing in a provider
table or automation state in cron — the schedule points to the target action;
the automation/component owns what the action means.

## Execution Identity

Monorepo `core/core/src/execution/execution_identity.lua` is the single frozen
capture/reconstruct/run-as primitive shared by scheduler, projections, cron,
automations, and channel triggers. Deferred work runs as the actor who
authorized it — never ambient system.

- **Persisted shape.** Two columns everywhere — `actor_id` (indexable) +
  `actor_context` (JSON: version, `scope_id` naming a resolvable scope, a
  durable claim subset, capture provenance). Schedules, jobs, and effect
  intents all carry both.
- **Capture** freezes the ambient signed actor plus the resolver-derived named
  scope. Requires an authenticated actor. System actors (`system:` prefix or
  `meta.system`) may pass an explicit `scope_name`; non-system actors may not.
- **Reconstruct is fail-closed.** A terminal actor status
  (`disabled`/`suspended`/`deleted`/`inactive`) or an unrecoverable scope
  refuses to run. Default mode rebuilds from frozen claims; live mode
  (`resolve_live`, via `run_actor_id` on a schedule) re-fetches fresh subject
  claims/groups/scope through `kickside.contract:scope_resolver`.
- **Run.** `run_as(identity, fn_id, args)` binds the reconstructed actor and
  scope and calls the function under them.

The projection worker rebuilds its owner from the stored columns and runs the
func/proc under it. A stored-but-unreconstructable identity is a hard error,
never a silent fall to system; a null `actor_id` means "run under the runner's
own system context," by design. Thread creation captures identity the same way.

## Workflows Module

`kickside.workflows` (monorepo `platform/workflows/`) is the visual workflow
builder. It is not thread-backed — its event log is its own SQL table. A
workflow is a component of class `workflow`; its component id is the workflow id.

### Definition Plane (Canvas CQRS)

`workflow_def_events` is the authority: per-workflow monotonic `seq`, unique
`(workflow_id, seq)`. Read-model tables (nodes/edges/notes/layout) are
projected from that stream. `apply(workflow_id, commands, actor)` validates the
whole batch, folds it (later commands see earlier ones), generates ids, then
appends every event and projects the read model in one SQL transaction. Command
dialect (`{type, body}`): `node.add/update/remove`, `edge.add/update/remove`,
`note.*`, `layout.set-position/clear-position/set-viewport`, `param.set`.

### Execution Plane (Compile, Publish, Launch)

The compiler treats the canvas as the IR: single-trigger validation,
reachability/acyclicity, per-edge predicate compilation, convergence
classification, and materialization of engine commands stamped with
`def_node_id`/`workflow_id`/`version`. `publish` folds and compiles inside one
transaction, allocates `head+1` against `UNIQUE(workflow_id, version)`, and
appends a `version.published` marker.

`launch(workflow_id, opts)` resolves the target published version, validates
bound config requirements, then:

1. Dedups on `(workflow_id, trigger_id, dedup_key)` — one envelope, one run.
2. Captures a frozen execution identity iff the compiled commands contain an
   await node and there is an actor — a parked workflow resumes days later as
   the original user.
3. Remints fresh node/data ids per run while preserving `def_node_id`,
   threading in the frozen identity, `run_id`, `dataflow_id`, `workflow_stack`,
   `depth`.
4. Inserts a run row and creates the dataflow with a durable completion
   callback that idempotently marks the run terminal and refreshes the
   component's public-meta counts.

### The Await Node

The await node arms a declarative resume trigger, then waits on a dataflow
signal; the durable wait is stored atomically with a deterministic correlation.
The arm contract is exactly these keys: `emit`, `execution_identity`,
`runnable_ref`, `mode`, `idempotency_key`, `trace_context`, `workflow_stack`,
`depth`, `workflow_id`, `run_id`, `call_node_id`. The resume trigger and cached
runtime state are orchestration details never persisted inside the yield; the
default trigger type is `external.signal`.

### Run As A Write

The workflow kind declares its trigger input as a `dir:in` writable port
implementing `kickside.data:writable`; `write(envelope)` launches one run of
the current published version. `POST /workflows/{id}/run` is thin sugar over
the same launch path.

## Human-In-The-Loop

Inbox is the human-in-the-loop port: a workflow appends or writes an inbox
item, then parks on an await correlated by domain key; the inbox projection
reduces item events into pending/resolved state; the user
approves/rejects/dismisses; the correlated event resolves the wait and the
workflow continues. Use public meta for component-wide inbox counts such as
`pending_count`. Do not store per-viewer unread state in component public meta.

## Realtime

Two distinct fanout seams. Do not conflate them.

### Thread And Projection Notify

Fire-and-forget, dependency-light. Topic taxonomy:

- **`kickside.thread.update`** — Default per-update topic when the caller names none
- **`kickside.threads`** — Overview firehose (list views)
- **`kickside.thread.<thread_id>`** — One thread's stream
- **`kickside.thread.<thread_id>.projection.<kind>`** — One thread's read-model advance stream

The payload envelope carries a `type` discriminator (`"event"` |
`"projection"`, default `"event"`), `projection_kind`, and `seq`. A projection
advance lands on both its per-kind topic and the overview. `notify.wake` is a
scheduler nudge, not a UI topic. Delivery resolves the audience (explicit ids,
acting user, ids in thread attrs) and sends to each user's hub — best-effort; a
missing hub is skipped, never raised.

### Component-Meta Notify (Grant-Resolved)

Component public meta fans out on `component.<id>` with the audience derived
from access grants — see [Canonical Model](00-canonical-model.md#realtime). The
workflow definition plane broadcasts on `workflow.<workflow_id>` the same way
after each persisted batch; clients optimistic-apply their own HTTP response
and filter WS deltas by `seq`, and a gap triggers a refetch from `?from_seq=`.

## Gotchas

1. **Events silently drop without an actor.** An emit helper with no
   `security.actor()`/`security.scope()` warns and returns — the event never
   lands, with no error.
2. **Declared projections require a reconstructable identity.** The writer
   refuses with `errors.INVALID` when the kind declares projections but the
   first-touch actor has no frozen identity; an anonymous caller cannot lazily
   create such a thread.
3. **Lazy threads read as empty, not missing.** `list_projections` on a
   never-emitted component returns empty sets rather than `NOT_FOUND` (real
   access-denied still surfaces); do not treat empty as "component doesn't
   exist."
4. **Concurrent-first-emit convergence.** `ensure_thread` distinguishes a
   `CONFLICT` where a peer won the create race (converge by re-reading the
   winner) from a `CONFLICT` on a component it just created (a partial-state
   fault — surfaced). `upsert` re-resolves the winner on `CONFLICT` too.
5. **Drop-notify teardown hook.** A subscriber projection may declare
   `drop_notify = { thread_id, type, body }`; when the source thread is
   deleted/purged, core appends a typed system event onto the subscriber's own
   thread and wakes its runner — "my source is gone" surfaces through the
   existing read model. Deduped per source-subscriber pair, best-effort.
6. **Proc worker ceilings.** A `proc://` worker runs as a monitored child with
   a wall-clock ceiling (`KICKSIDE_PROJECTION_PROC_MAX_EXECUTION_MS`, default
   600000) and liveness polls; a hung worker is terminated and released for
   retry. The ceiling is for hangs — a progressing worker runs to completion.
7. **Cursor dead-lettering.** After `KICKSIDE_PROJECTION_MAX_ATTEMPTS` reserves
   (default 8), a cursor is dead-lettered to `invalid` with `dead_at` stamped
   rather than replaying its range forever; the durable per-cursor counter
   resets on a successful apply.
8. **Enqueue + event atomicity only via `thread_event`.** Separate enqueue and
   append can desync on a crash. External dedupe lets the event append land
   even when the job itself dedupes to nothing.
9. **Poll-vs-watch double-count asymmetry.** A poll page with failed keys stays
   unacknowledged and replays, so its accepted counts emit only on success —
   otherwise the fold double-counts on replay. A watch batch is final: counts
   emit immediately, failures read as skips. A fold over retried batches must
   tolerate this.
10. **Cron `resolve_live` fail mode.** A live schedule treats a missing
    `kickside.contract:scope_resolver` as a retriable dispatch-time failure and
    never runs under frozen claims; frozen schedules keep the resolver optional.
11. **Await identity is conditional.** A run captures a frozen identity only if
    the compiled commands contain an await and there is an actor; do not rely
    on one being present for every run.

## Anti-Patterns

- A worker updates public meta and a projection also updates it.
- A frontend calls `get_stats` while component public meta already has counts.
- A provider writes another module's storage directly.
- A workflow stores correlation only in private context.
- A projection runs without a reconstructable actor.
- A retry path changes public meta timestamps forever without moving state.
