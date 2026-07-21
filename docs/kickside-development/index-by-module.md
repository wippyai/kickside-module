# Index By Module

## Core

- **`core/contract`**
  - **Role:** typed contract and binding system
  - **Read:** [Contracts And Ports](02-contracts-and-ports.md)
- **`core/component`**
  - **Role:** component/access/public-meta backbone
  - **Read:** [Component Development](01-component-development.md)
- **`core/core`**
  - **Role:** threads, events, projections, jobs, trace
  - **Read:** [Threads, Events, And Projections](03-threads-events-projections.md)
- **`core/cron`**
  - **Role:** scheduling primitive
  - **Read:** [Threads, Events, And Projections](03-threads-events-projections.md)
- **`core/jobs`**
  - **Role:** finite deferred work and effect intents
  - **Read:** [Threads, Events, And Projections](03-threads-events-projections.md)

## Platform

- **`platform/connection`**
  - **Role:** component-backed provider connections
  - **Read:** [Connections And Integrations](04-connections-and-integrations.md)
- **`platform/oauth`**
  - **Role:** provider OAuth and token handling
  - **Read:** [Connections And Integrations](04-connections-and-integrations.md)
- **`platform/identity`**
  - **Role:** external identity/linking support
  - **Read:** [Connections And Integrations](04-connections-and-integrations.md)
- **`platform/uploads`**
  - **Role:** upload records, processors, artifacts, tokens
  - **Read:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
- **`platform/knowledge`**
  - **Role:** KB control plane and engine contracts
  - **Read:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
- **`platform/blocks`**
  - **Role:** typed Block validation, discovery, lowering, waits, and tool projection
  - **Read:** [Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md)
- **`platform/workflows`**
  - **Role:** optional visual Workflow definitions and editor
  - **Read:** [Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md)
- **`platform/automation`**
  - **Role:** install/control/trigger engine for automation kinds
  - **Read:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
- **`platform/sync`**
  - **Role:** Data Sync automation kind
  - **Read:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
- **`platform/webhooks`**
  - **Role:** user-minted trigger source endpoints
  - **Read:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
- **`platform/inbox`**
  - **Role:** human review/approval seam
  - **Read:** [Knowledge, Uploads, Automation, And Inbox](05-knowledge-uploads-automation-inbox.md)
- **`platform/channel`**
  - **Role:** external Channel responder automation and provider-neutral channel bridge
  - **Read:** [Connections And Integrations](04-connections-and-integrations.md)
- **`platform/dm`**
  - **Role:** direct-message channel surface
  - **Read:** [Connections And Integrations](04-connections-and-integrations.md)
- **`platform/agents`**
  - **Role:** user agents, traits, tools, resolver
  - **Read:** [Agents, Skills, And Models](06-agents-skills-models.md)
- **`platform/skills`**
  - **Role:** reusable skill bundles
  - **Read:** [Agents, Skills, And Models](06-agents-skills-models.md)
- **`platform/models`**
  - **Role:** model catalog, provider profiles, resolver
  - **Read:** [Agents, Skills, And Models](06-agents-skills-models.md)
- **`platform/mcp`**
  - **Role:** actor-scoped MCP credentials and endpoint
  - **Read:** [Agents, Skills, And Models](06-agents-skills-models.md)
- **`platform/realtime`**
  - **Role:** realtime contract
  - **Read:** [Contracts And Ports](02-contracts-and-ports.md)
- **`platform/security`**
  - **Role:** scopes, role catalog, and policy support
  - **Read:** [Canonical Model](00-canonical-model.md)
- **`platform/settings`**
  - **Role:** runtime settings and admin-editable blocks
  - **Read:** [Application Patterns](10-application-patterns.md)
- **`platform/ui`**
  - **Role:** nav/admin UI APIs
  - **Read:** [Frontend And Web Components](07-frontend-and-web-components.md)
- **`platform/hub`**
  - **Role:** module catalog/install/uninstall
  - **Read:** [Frontend And Web Components](07-frontend-and-web-components.md)
- **`platform/widgets`**
  - **Role:** shared web components reused by modules
  - **Read:** [Frontend And Web Components](07-frontend-and-web-components.md)
- **`platform/renderers`**
  - **Role:** renderer registry/API
  - **Read:** [Frontend And Web Components](07-frontend-and-web-components.md)
- **`platform/transform`**
  - **Role:** transform/eval primitives
  - **Read:** [Application Patterns](10-application-patterns.md)
- **`platform/transfer`**
  - **Role:** transfer/import-export support
  - **Read:** [Application Patterns](10-application-patterns.md)
- **`platform/users`**
  - **Role:** users, groups, profile, and admin APIs
  - **Read:** [Component Development](01-component-development.md)
- **`platform/sessions`**
  - **Role:** durable agent/session surface
  - **Read:** [Agents, Skills, And Models](06-agents-skills-models.md)
- **`platform/self-reflection`**
  - **Role:** bounded registry reflection and namespace inspection
  - **Read:** [Discovery, Addressing, And Context](19-discovery-addressing-and-context.md)
- **`platform/orders`, `platform/pim`**
  - **Role:** example business modules using module-owned records and app surfaces
  - **Read:** [Application Patterns](10-application-patterns.md)

## Modules Published Elsewhere

Provider, engine, and private business packages are independent repositories.
Their installed declarations and published README are authoritative. Search the
Hub by capability, use dependency `plan` with `include_entries`, then follow
[Discovery, Addressing, And Context](19-discovery-addressing-and-context.md).
Do not assume an old `providers/<name>` monorepo path still exists.

## App

- **`app/src/app/deps`**
  - **Role:** app dependency composition
  - **Read:** [Canonical Model](00-canonical-model.md)
- **`app/src/app/views`**
  - **Role:** host-rendered page entries
  - **Read:** [Frontend And Web Components](07-frontend-and-web-components.md)
- **`app/frontend/applications/main`**
  - **Role:** registry-driven SPA shell
  - **Read:** [Frontend And Web Components](07-frontend-and-web-components.md)
- **[frontend/](frontend/frontend-handbook.md)**
  - **Role:** Wippy frontend implementation guides
  - **Read:** [Frontend And Web Components](07-frontend-and-web-components.md)

## Scale Patterns

- **Stateless utility app** — [Application Patterns](10-application-patterns.md)
- **Saved workbook/tool** — [Application Patterns](10-application-patterns.md)
- **Workflow/data-flow builder** — [Application Patterns](10-application-patterns.md)
- **ERP/CRM/SAP-style module** — [Application Patterns](10-application-patterns.md)
