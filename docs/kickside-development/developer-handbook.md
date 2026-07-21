# Kickside Development Handbook

This handbook is the canonical development map for building Kickside modules:
components, contracts, integrations, web components, automations, knowledge
engines, uploads, inbox flows, agents, skills, and app surfaces.

Kickside is assembled from independently published Wippy modules. This wiki is
the standalone authoring handbook for those modules; the lower-level frontend
guides live in [frontend/](frontend/frontend-handbook.md). It pairs with this
repository's [working scaffold](../../README.md). The public canonical starter
is [wippyai/kickside-module](https://github.com/wippyai/kickside-module).

## Reading Order

1. [Canonical Model](00-canonical-model.md) - the vocabulary shared by every
   module.
2. [Component Development](01-component-development.md) - how to model durable
   user-owned resources.
3. [Contracts And Ports](02-contracts-and-ports.md) - how modules expose stable
   APIs without direct coupling.
4. [Threads, Events, And Projections](03-threads-events-projections.md) - the
   workflow and read-model layer.
5. [Connections And Integrations](04-connections-and-integrations.md) - provider
   modules, credentials, reply targets, OAuth, and external resources.
6. [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
   - the product modules most often composed into workflows.
7. [Agents, Skills, And Models](06-agents-skills-models.md) - agent-facing
   extension points.
8. [Frontend And Web Components](07-frontend-and-web-components.md) - app shell,
   module-owned pages, and host integration.
9. [Recipes](08-recipes.md) - concrete build paths.
10. [Application Patterns](10-application-patterns.md) - how the same primitives
    scale from a calculator to ERP-style modules.
11. [Design Gaps](11-design-gaps.md) - current seams to keep tight while building.
12. [Module Layout](12-module-layout.md) - canonical on-disk shape for every
    module.
13. [Testing](13-testing.md) - module test suites and runnable harnesses.
14. [Dev Loop](14-dev-loop.md) - live development against a running app.
15. [Publishing](15-publishing.md) - versioning, dependencies, hub publish.
16. [Conventions](16-conventions.md) - the recurring `_index.yaml` shapes:
    namespaces, wiring, events, security, settings, env, HTTP.
17. [Settings](17-settings.md) - definitions, blocks, tabs, secrets, admin
    overrides.
18. [Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md) -
    canonical executable-composition vocabulary and ownership.
19. [Discovery, Addressing, And Context](19-discovery-addressing-and-context.md) -
    exact ids, typed registry search, component lookup, tool/Block discovery,
    and actor-safe invocation.
20. [Checklists](09-checklists.md) - review gates before publishing.

## Quick Index

- **A resource users create/share/delete**
  - **Start here:** [Component Development](01-component-development.md)
  - **Canonical owner:** `kickside.component`
- **An existing declaration, component, tool, or Block**
  - **Start here:** [Discovery, Addressing, And Context](19-discovery-addressing-and-context.md)
  - **Canonical owner:** root `ns.definition` + owning catalog/service
- **A stable interface other modules call**
  - **Start here:** [Contracts And Ports](02-contracts-and-ports.md)
  - **Canonical owner:** `kickside.contract`
- **A workflow with waits, callbacks, or human steps**
  - **Start here:** [Threads, Events, And Projections](03-threads-events-projections.md)
  - **Canonical owner:** `kickside.core` thread log
- **A reusable executable capability or composed Flow**
  - **Start here:** [Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md)
  - **Canonical owner:** `kickside.blocks` + `wippy/dataflow`
- **A visual Workflow editor and published definition**
  - **Start here:** [Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md)
  - **Canonical owner:** optional `kickside/workflows`
- **An automation kind**
  - **Start here:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
  - **Canonical owner:** `kickside.automation` engine + kind module
- **A provider connection**
  - **Start here:** [Connections And Integrations](04-connections-and-integrations.md)
  - **Canonical owner:** `kickside.connection` + provider module
- **A file conversion/processing pipeline**
  - **Start here:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
  - **Canonical owner:** `kickside.uploads`
- **A KB engine or KB ingestion path**
  - **Start here:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
  - **Canonical owner:** `kickside.knowledge` + engine provider
- **A human approval/review step**
  - **Start here:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
  - **Canonical owner:** `kickside.inbox`
- **An agent trait, tool, or reusable procedure**
  - **Start here:** [Agents, Skills, And Models](06-agents-skills-models.md)
  - **Canonical owner:** `kickside.agents` / `kickside.skills`
- **A product page or embedded UI**
  - **Start here:** [Frontend And Web Components](07-frontend-and-web-components.md)
  - **Canonical owner:** `view.component` + `ui.nav_item`
- **A small utility app**
  - **Start here:** [Application Patterns](10-application-patterns.md)
  - **Canonical owner:** web component, optional component
- **A large ERP/CRM/workflow module**
  - **Start here:** [Application Patterns](10-application-patterns.md)
  - **Canonical owner:** module-owned tables + component roots + events
- **Any module's file/folder layout**
  - **Start here:** [Module Layout](12-module-layout.md)
  - **Canonical owner:** `src/`, `api/`, `binding/`, `persist/`, `migrations/`
- **Any module's namespaces, security, settings, env, API shape**
  - **Start here:** [Conventions](16-conventions.md)
  - **Canonical owner:** `_index.yaml` entry kinds
- **Admin-editable settings, blocks, System tabs**
  - **Start here:** [Settings](17-settings.md)
  - **Canonical owner:** `kickside.settings` + `ui.settings_tab`

## Source Map

The handbook is grounded in these Kickside monorepo surfaces (paths relative to
the monorepo root; useful when working with a full checkout, not required for
authoring from this repo):

- **Core modules** — `core/README.md`
- **Component service** — `core/component/src/_index.yaml`, `core/component/src/component.lua`, `core/component/src/meta_service.lua`
- **Threads/events/projections/jobs** — `core/core/src/threads`, `core/core/src/projections`, `core/jobs/src`, `core/core/src/trace`
- **Cron** — `core/cron/src/_index.yaml`
- **Platform modules** — `platform/README.md`
- **Connections** — `platform/connection/src/README.md`, `platform/connection/src/_index.yaml`
- **Uploads** — `platform/uploads/src/README.md`, `platform/uploads/src/_index.yaml`
- **Knowledge** — `platform/knowledge/src/README.md`, `platform/knowledge/src/_index.yaml`
- **Automation engine** — `platform/automation/README.md`, `platform/automation/src/_index.yaml`
- **Automation kinds** — `platform/sync/src/_index.yaml`, `platform/channel/src/responder/_index.yaml`
- **Blocks and visual Workflows** — `platform/blocks/src/_index.yaml`, `platform/workflows/src/_index.yaml`
- **Inbox** — `platform/inbox/src/README.md`
- **Agents and skills** — `platform/agents/src/README.md`, `platform/skills/src/README.md`
- **Models** — `platform/models/src/README.md`
- **App shell** — `app/README.md`, `app/src/app/views/_index.yaml`, `app/frontend/applications/main/src`
- **Frontend guides** — [frontend/](frontend/frontend-handbook.md)

Provider and business modules published from other repositories are discovered
from the Hub. Use [Discovery, Addressing, And Context](19-discovery-addressing-and-context.md)
and inspect their published entries; do not infer their current source layout
from a historical monorepo path.

## Rules

- Components are the resource/access/public-meta backbone.
- Threads are the durable event log for workflow facts.
- Projections build read models and public component meta from durable facts.
- `private_context` is private configuration/state, not UI status.
- Public `meta` is renderable state; it must not hold secrets or raw config.
- Frontend reads APIs and component public meta. It does not query storage.
- Providers plug in through contracts and registry entries, not central branches.
- Long-running/deferred execution preserves actor identity through canonical
  execution identity, not ad hoc user columns or metadata aliases.
- Do not add a new vocabulary when an existing component, contract, port, thread,
  projection, or registry entry already owns the concept.

## Design Notes

The handbook documents the intended architecture. Known seams that need care are
tracked in [Design Gaps](11-design-gaps.md), so new module work does not
accidentally recreate parallel status endpoints, direct SQL joins, or
feature-specific realtime topics.
