# Recipes

Use these as starting paths. They intentionally reuse the canonical primitives
instead of creating feature-specific frameworks.

## New Component Kind

1. Pick the owning module.
2. Add a `contract.binding` or registry entry for the kind.
3. Define public meta fields and private context fields.
4. Register through `kickside.component`.
5. Add access checks through component service.
6. Add `kickside.contract:deletable` if private data exists.
7. Add a component-state projection if meta derives from events.
8. Add a web component and `ui.nav_item` only if it needs a page.
9. Add tests for create/read/update/delete/access/meta.

## New Provider Connection

1. Create a provider module under `providers`.
2. Implement `kickside.connection:connection`.
3. Implement `kickside.connection:reply_provider` if it can send replies.
4. Put credentials in connection private context or OAuth storage.
5. Normalize discovered resources.
6. Register provider UI as `view.component` when needed.
7. Add provider traits/tools as registry entries.
8. Test create, validate, discover, reply, and delete.

## New KB Engine

1. Implement `kickside.knowledge:kb_store_lifecycle`.
2. Declare source-materialization projections (`projections` + `worker_ref` in the engine descriptor) if source ingestion is supported.
3. Add one `kickside.kb_engine` registry entry.
4. Declare default config and UI ids.
5. Keep engine SQL inside the provider module.
6. Let knowledge control plane create/list/delete KB components.
7. Let source thread projection materialize documents/summaries/chunks/images.
8. Test store create, materialization, browse/search, delete, and access through
   the knowledge API.

## Upload-To-KB Workflow

1. User uploads through uploads.
2. Upload processor writes artifacts.
3. KB ingest API writes a durable ingest request event.
4. Source materializer resolves upload content through uploads contract/token.
5. Engine materializer writes source nodes.
6. Digest/enrichment writes durable facts or engine graph state.
7. KB component-state owner updates public meta.
8. Frontend receives component meta and reloads detail data if needed.

## Human Approval Flow

1. Begin a trace with `trace_context`.
2. Append domain request event.
3. Write an inbox item through `kickside.inbox.sink:inbox_sink`.
4. Store correlation in the item/event, not in UI state.
5. Wait for approved/rejected event by `run_id + type + correlation_key`.
6. Continue through a projection/job.
7. Update component public meta through the state owner.

## Event-Driven Automation

1. Automation type declares an out/source or in/sink port.
2. Install creates a component and stores private state.
3. Source projection subscribes to the selected component thread.
4. Projection preserves trace context.
5. Trigger worker runs under installer identity.
6. Sink receives a contract call or thread event.
7. Public status/counts are written through component meta.

## Module-Owned Product Page

1. Build a Wippy web component.
2. Serve it from the module with `http.static`.
3. Declare `view.component` with `tag_name`, `base_path`, and `entry_point`.
4. Declare `ui.nav_item` with `render: component`.
5. Use `route` attribute for deep links.
6. Emit `navigate` events.
7. Use the host proxy API for HTTP and realtime.

## Agent Tool

1. Add `function.lua` with `meta.type = tool`.
2. Declare input/output schemas.
3. Call service/contract layer under ambient actor.
4. Preserve trace/identity if enqueueing deferred work.
5. Add tool metadata for display and LLM use.
6. Add tests with a non-admin actor when access matters.

## Cron-Backed Action

1. Component/automation owns action config.
2. Cron owns schedule timing.
3. Schedule stores frozen execution identity.
4. Cron opens target action under reconstructed actor.
5. Action writes durable events or component public meta through canonical owners.
6. Delete removes schedule through rollback/deletable path.
