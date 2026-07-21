# Agents, Skills, And Models

Agents are component-backed user resources assembled at runtime by a resolver.
Skills are versioned procedure bundles agents author and invoke. Models are
DB-discovered catalog records resolved through classes. Traits and tools are the
registry surface any module uses to extend agents.

File citations in backticks (for example
`platform/agents/src/agent_resolver.lua:205-209`) are monorepo-relative source
grounding. The page stands alone; the citations tell you where each rule is
pinned.

## Ownership

- **`kickside.agents`** — `agents`/`tools` contracts, `user_agent` kind, resolver binding, runner, built-in traits, agent CRUD API
- **`kickside.skills`** — skills/skill_versions/skill_files storage, store dispatchers, Skills trait, `Skill`/`SkillFile` tools, reserved runtime
- **`kickside.models`** — model classes, DB provider profiles, model discovery, model card overlays, `wippy.llm:model_resolver` binding
- **any module** — its own traits and tools under `src/traits/`

## Traits

A trait (a "capability" in the UI) is one `registry.entry` with
`meta.type: agent.trait`: a static prompt fragment, optional prompt/build
functions, and member tools. The agents module discovers traits purely through
the registry; a contributing module has no code coupling back to
`kickside.agents` (`platform/inbox/src/traits/_index.yaml:9`).

Modules ship traits under `platform/<module>/src/traits/` with an `_index.yaml`
whose namespace is `kickside.<module>.traits`. Sub-families nest with their own
`_index.yaml` (`platform/knowledge/src/traits/kb_ingest/`).

Trait entry fields (`platform/knowledge/src/traits/_index.yaml:10-54`):

- **`meta.type: agent.trait`** — Required; makes the agents module pick the entry up
- **`meta.title` / `icon` / `comment` / `tags`** — Picker metadata
- **`meta.public: true`** — Offered in the Capabilities picker
- **`meta.private: true`** — Never listed; resolver-attached only
- **`meta.web_component`** — Config UI element for the trait
- **`meta.context_schema`** — JSON schema for the trait's `trait_contexts` payload; properties carry `role: picker\|value` and their own `web_component`
- **`prompt`** — Static prompt injected while the trait is active
- **`build_func_id`** — Function run once at compile; folds config context into the prompt
- **`prompt_func_id`** — Function run each step; injects a dynamic prompt
- **`tools`** — Member-tool registry ids the trait activates

A static trait needs only `prompt` + `tools`. Complete example
(`platform/inbox/src/traits/_index.yaml:12-79`):

```yaml
  - name: inbox_submit
    kind: registry.entry
    meta:
      type: agent.trait
      title: Submit to Inbox
      public: true
      icon: tabler:inbox
      comment: Escalates an item to a person's review inbox for approval or attention.
      tags: [inbox, review, hil]
    prompt: |
      You can send an item to the human review inbox using the SubmitToInbox tool.
      ...
    tools:
      - kickside.inbox.traits:inbox_submit_tool
```

A configured trait declares `context_schema` + `web_component`; the agent
editor writes chosen values into the agent's `trait_contexts[<trait_id>]`, and
the resolver validates that map against each schema before launch
(`platform/agents/src/agent_resolver.lua:211-243`). Trait config UI is the
declared web component, never code inside the agent editor.

The function hooks are ordinary `function.lua` entries with `method: execute`:
`init_skills` (build) folds `context.skill_ids` into the prompt at compile
(`platform/skills/src/traits/_index.yaml:17-27`); `active_skills` (prompt) runs
each step (same file, lines 28-37).

Runtime activation: `trait_curator`/`trait_master`
(`platform/agents/src/traits/_index.yaml:222-372`) let an agent toggle other
traits mid-session by emitting a `_control.config.traits` directive that
recompiles the session.

## Tools

A tool is a `function.lua` entry with `meta.type: tool` — the only registry
kind an LLM calls directly. Complete example
(`platform/inbox/src/traits/_index.yaml:30-78`):

```yaml
  - name: inbox_submit_tool
    kind: function.lua
    meta:
      type: tool
      title: Submit to Inbox
      mcp:
        required_scopes:
          - state.read
          - state.write
      llm_alias: SubmitToInbox
      llm_description: Send an item to the human review inbox for approval or attention. Returns the created item id.
      input_schema: |
        {
          "type": "object",
          "properties": {
            "title": { "type": "string", "description": "Short summary shown in the inbox" },
            "content": { "type": "string", "description": "Detail and context for the reviewer" },
            "priority": { "type": "string", "enum": ["low", "normal", "high", "urgent"], "description": "Defaults to normal" },
            "item_type": { "type": "string", "description": "Declared inbox item kind; defaults to notice" },
            "trace_context": { "type": "object", "properties": { ... }, "additionalProperties": false }
          },
          "required": ["title"]
        }
      output_schema: |
        {
          "type": "object",
          "properties": {
            "success": { "type": "boolean" },
            "id": { "type": "string" },
            "error": { "type": "string" }
          },
          "required": ["success"]
        }
    source: file://inbox_submit.lua
    method: handle
    modules: [security]
    imports:
      inbox_writer: kickside.inbox.persist:inbox_writer
```

- **`meta.type: tool`** — Required
- **`meta.llm_alias`** — Function name the model sees (`SubmitToInbox`, `QueryKB`)
- **`meta.llm_description`** — Model-facing description
- **`meta.input_schema`** — JSON string (block scalar or escaped inline); argument contract
- **`meta.output_schema`** — JSON string documenting the return; must match the return convention
- **`meta.mcp.required_scopes`** — Capability scopes (`state.read`, `state.write`)
- **`source` / `method`** — Lua file and exported function
- **`modules`** — Host modules the impl may require (`security`, `contract`, `ctx`, `funcs`, `json`)
- **`imports`** — Aliased registry entries the impl may require

Tools call service/contract layers, not direct SQL, unless the tool belongs to
the persistence module.

### Binding paths

Two independent paths put a tool on an agent
(`platform/agents/src/agent_resolver.lua:221-271`):

1. Via a trait: the trait's `tools:` list. A trait can wildcard a whole
   namespace — File Manager binds `kickside.uploads.traits:*`
   (`platform/uploads/src/traits/_index.yaml:72`).
2. Directly on the agent: the persisted `tools: [...]` array in private
   context, copied verbatim into the tool list.

### Trait context reaches tools through ctx

The compiler binds `trait_contexts` values onto the tool's execution ctx; the
tool reads them with `ctx.get("kb_ids")`. The positional `context` parameter is
the unit-test injection seam only
(`platform/knowledge/src/traits/kb_query.lua:49-57`). A tool that reads config
from its args gets nils in production.

### Return conventions

Three shapes coexist. Pick one per tool; `output_schema` must describe it.
Mixing shapes silently breaks the model contract.

- **Markdown string**
  - **Return:** plain markdown string
  - **Errors:** `_reason_` italic line or `Error:` prefix
  - **Examples:** KB query, uploads (`platform/knowledge/src/traits/kb_query.lua:78`, `platform/uploads/src/traits/count_files.lua:8`)
- **Envelope table**
  - **Return:** `{ success = true, ... }`
  - **Errors:** `{ success = false, error = "..." }`
  - **Examples:** inbox, kb_embed (`platform/inbox/src/traits/inbox_submit.lua:18-49`)
- **Control**
  - **Return:** object carrying a `_control` directive (handoff, recompile)
  - **Errors:** envelope or string
  - **Examples:** `redirect_action`, `skill_tool` activate (`platform/skills/src/traits/skill_tool.lua:87-92`)

A tool that can return either markdown or a control object declares
`output_schema` as a `oneOf` (`redirect_action`).

## Skills

A skill is one `components` row (identity/access/sharing) + one `skills` row
whose `current_version_id` points at the head `skill_versions` row + immutable
`skill_files` (references, assets, scripts). Refinement cuts a new immutable
version atomically (`platform/skills/src/README.md:4-11`). Skills are authored
at runtime by agents, not shipped as registry entries.

Store dispatchers are per-method `function.lua` entries
(`platform/skills/src/_index.yaml:323-419`): commands (`skill_create`,
`skill_refine`, `skill_delete`, `skill_share`) route to `persist/writer.lua`;
queries (`skill_get`, `skill_list`, `skill_list_files`, `skill_read_file`,
`skill_list_versions`) to `persist/reader.lua`. Each runs under the caller's
actor so the component service enforces per-skill access; calling
reader/writer outside that actor context bypasses the access model. The
`skill_runtime` contract exposes only `activate`/`list_files`/`read_file`.

The agent surface (`platform/skills/src/traits/_index.yaml`):

- Skills trait: `web_component: kickside-skill-picker`,
  `context_schema.skill_ids`, `build_func_id: init_skills`,
  `prompt_func_id: active_skills`, tools `skill_tool` + `skill_file_tool`.
- `Skill` tool: actions `list`/`use`/`activate`/`deactivate`/`save`/`refine`/
  `delete`/`share`/`unshare`. The handler maps each action to a store
  dispatcher via `funcs.call("kickside.skills:" .. fn, parsed_args)`
  (`platform/skills/src/traits/skill_tool.lua:122`), carrying the caller's
  actor. `activate`/`deactivate` mutate the session's `active_skills` set with
  a `_control` directive, not the store.
- `SkillFile` tool: reads bundled files on demand by `skill_id` + `path`.

Pinned skills: when `trait_contexts["...:skills"].skill_ids` is set,
`init_skills` bakes those skill bodies into the prompt at compile.

V1 stores scripts (`skill_files.kind = "script"` + `executable`) but does not
execute them (`platform/skills/src/README.md:38-54`). The reserved runner slot
is `platform/skills/src/runtime/`; it belongs in `kickside.skills`, not in
agents or app code. A bundled `scripts/run.py` does not run today.

## Agents

Agents are components, not static registry entries. Core entries in
`platform/agents/src/_index.yaml`:

- **`kickside.agents:agents`**
  - **Kind:** `contract.definition`
  - **Role:** CRUD facade: create/find/upsert/update/delete/list, attach/detach kb and tool
- **`kickside.agents:tools`**
  - **Kind:** `contract.definition`
  - **Role:** Read-only tool discovery: find/list
- **`kickside.agents:user_agent`**
  - **Kind:** `contract.binding`
  - **Role:** The kind backing every user agent; its id is the `impl_id` discriminator (`platform/agents/src/types.lua:13`); component class `agent`; binds `kickside.contract:component`, `kickside.contract:deletable`, `kickside.data:writable`
- **`kickside.agents:agent_resolver`**
  - **Kind:** `contract.binding`
  - **Role:** Binds `wippy.agent:resolver` (`default: true`)

Built-in registry agents can be contributed by any module as `agent.gen1`
entries.

Agent config persists in the component's private context as `AgentConfig`
(`platform/agents/src/types.lua:54-68`): `prompt`, `model`, `temperature`,
`max_tokens`, `thinking_effort`, `traits`, `trait_contexts`,
`trait_agent_options`, `agent_options`, `tools`, `delegates`,
`memory_target_id`, `memory_provider_id`. Rendered fields
(title/description/icon/status/model) are public meta.

### Resolver assembly

`platform/agents/src/agent_resolver.lua:resolve` (bound to
`wippy.agent:resolver`):

1. Accepts `user_agent:<component_id>` or a bare id (lines 154-160).
2. Opens the component service under the caller's actor + scope and gates on
   READ access (lines 124-145, 183-194).
3. Rejects components whose `impl_id` is not `kickside.agents:user_agent`.
4. Builds traits from `private_ctx.traits`, attaching validated per-trait
   `context` and `agent_options`; seeds master-trait runtime context
   (lines 221-264).
5. Auto-attaches the private `delegate` trait when delegates exist and turns
   each delegate into a sanitized LLM tool (lines 273-302).
6. Copies `private_ctx.tools` verbatim into the tool list (lines 266-271).

### Memory

Memory provider behavior stays inside provider contracts: activate/load the
memory target, list/read memory files, write recall or ingest through the
owning KB/skill/upload services. The agent runner carries no provider-specific
memory storage.

## Models

An agent's `model` is a concrete model name or a class reference
`class:<name>`; the create-time default is `class:fast`
(`platform/agents/src/types.lua:40`). The resolver fails closed when `model`
is missing rather than substituting a default
(`platform/agents/src/agent_resolver.lua:205-209`).

Model classes are `registry.entry` with
`meta.type: kickside.models:model_class`
(`platform/models/src/classes/_index.yaml`), each carrying `key`, `title`,
`weight`, `capability`. The shipped vocabulary is exactly:

- **`nano`** — generate
- **`fast`** — generate
- **`balanced`** — generate
- **`premium`** — generate
- **`embed`** — embed

`llm.model` cards are not shipped statically; the catalog ships only the
`policy` library. Models are discovered from a configured provider profile at
onboarding, then admins assign classes. Discovered models get no broad
inferred aliases, so an agent hard-coding a vendor model id may not resolve on
another install — reference classes (`platform/models/src/README.md:12-19`).

Provider profiles are DB-backed (`llm.provider`, encrypted secrets), holding
endpoint/auth/config; model cards hold call defaults and classes.
`kickside.models:model_resolver` binds `wippy.llm:model_resolver`
(`default: true`) so `llm.generate/structured_output/embed/status` resolve DB
model cards before registry defaults (`platform/models/src/_index.yaml:143-158`).

Adding a provider: one adapter in `platform/models/src/discovery/providers/`,
registered in the discovery registry, published in the discovery
`_index.yaml`, with the provider id wired through DB profile types/presets. Do
not patch vendored `wippy.llm` for connector-level discovery.

## Identity

Tool execution runs under the agent/session actor. Preserve identity when a
tool enqueues deferred work. The resolver enforces this structurally: it
requires `security.actor()` + `security.scope()` and opens the component
service `:with_actor(actor):with_scope(scope)`
(`platform/agents/src/agent_resolver.lua:130-140`).

Actor guard inside a tool (`platform/inbox/src/traits/inbox_submit.lua:28-31`):

```lua
    local actor = security.actor()
    if not actor or not non_empty_string(actor:id()) then
        return { success = false, error = "authenticated actor is required" }
    end
```

Component access from a tool goes through `component.validate_access`
(`platform/knowledge/src/traits/kb_render.lua:155-160`):

```lua
local function deny(kb_id: any): string?
    if type(kb_id) ~= "string" or kb_id == "" then return "_kb_id is required_" end
    local _, err = component.validate_access(kb_id :: string, component.ACCESS.READ)
    if err then return "_access denied_" end
    return nil
end
```

Because the tool runs under the caller's actor, `validate_access` resolves
against that user's grants, and the actor propagates into any service or store
the tool calls (uploads `contract:open`, skill `funcs.call` dispatchers) — no
tool re-implements authorization. Modules are permission-agnostic: HTTP auth
is the host router's job; per-resource access is the component service's job.

## Gotchas

1. An empty system prompt is substituted with "You are a helpful AI
   assistant." because the Claude provider rejects empty text blocks tagged
   for prompt caching (`platform/agents/src/agent_resolver.lua:305-309`). The
   missing-model case, by contrast, fails closed.
2. Dangling delegates are dropped, not errored: when a delegate's target agent
   is deleted, the resolver omits it from both the tool list and the delegate
   prompt. Delegate tool names are slugged to `^[a-zA-Z0-9_-]+$` with
   collision suffixes (`agent_resolver.lua:281-290, 112-122`).
3. Some traits are hidden or auto-attached: `redirect` is assignable but
   hidden from the Capabilities picker (configured via a dedicated tab);
   `delegate` is `meta.private: true`. A picker listing `agent.trait` entries
   must honor `public`/`private`
   (`platform/agents/src/traits/_index.yaml:24-77`).
4. Master traits recompile the session mid-turn via `_control` directives
   (`config.traits`, `context.session.set`); the resolver seeds
   `base_traits`/`self_id` so activation never drops the agent's own traits
   and does not leak across a redirect (`agent_resolver.lua:246-264`).
