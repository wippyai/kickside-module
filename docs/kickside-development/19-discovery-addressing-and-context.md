# Discovery, Addressing, And Context

This page is the practical "find before build" path. It explains how a module,
registry declaration, component instance, contract, tool, and Block are named;
which discovery API owns each one; and when execution context is required.

## Five Identities That Must Not Be Mixed

- **Published module**
  - **Example:** `kickside/inbox`
  - **Meaning:** Hub dependency and versioning identity
- **Root namespace**
  - **Example:** `kickside.inbox`
  - **Meaning:** Namespace declared by the module's root `ns.definition`
- **Registry entry**
  - **Example:** `kickside.inbox.traits:inbox_submit_tool`
  - **Meaning:** Exact immutable declaration id, always `namespace:name`
- **Contract**
  - **Example:** `kickside.data:writable`
  - **Meaning:** Exact registry id of a `contract.definition`
- **Component instance**
  - **Example:** `019f...`
  - **Meaning:** Durable resource id stored by the component service

The module name does not determine its namespace. Never convert `/` to `.`,
singularize a word, or infer a namespace from a directory. Read the package's
root `ns.definition`; it is authoritative for packed and unpacked modules alike.

A component instance id is not a registry id. The registry describes what can
exist. The component service stores the user-owned instances that do exist.

## Choose The Correct Lookup

- **One exact declaration id**
  - **Use:** `registry.get("namespace:name")`
  - **Do not use:** a broad scan followed by string guessing
- **Declarations of a known type**
  - **Use:** `registry.find` with `.kind` and canonical `meta.*` fields
  - **Do not use:** component SQL or mutable display labels
- **Components visible to the actor**
  - **Use:** `component` service `list`, `query`, or `open`
  - **Do not use:** `registry.find`
- **An implementation of a contract**
  - **Use:** the contract service/open path
  - **Do not use:** a module-name heuristic
- **Agent-visible tools**
  - **Use:** `kickside.agents:tools`
  - **Do not use:** every `function.lua` row
- **Composable Blocks**
  - **Use:** `kickside.blocks:blocks` or `kickside.blocks:list`
  - **Do not use:** raw entries without Block validation
- **Installed or proposed package entries**
  - **Use:** Keeper Hub `list`/`plan` with `include_entries`
  - **Do not use:** installing blindly to inspect it

Use an exact id whenever a persisted definition or another declaration refers
to something. Search is for discovery and authoring; execution plans must not
silently switch implementation because a fuzzy search returned a different row.

## Registry Discovery

`registry.get` reads one known declaration:

```lua
local entry, err = registry.get("kickside.inbox.traits:inbox_submit_tool")
if err or not entry then return nil, err or "tool is not installed" end
```

`registry.find` queries indexed declaration fields. Start with the entry kind
and the canonical discriminator owned by that extension point:

```lua
local tools, err = registry.find({
    [".kind"] = "function.lua",
    ["meta.type"] = "tool",
})

local bindings, bind_err = registry.find({
    [".kind"] = "contract.binding",
    ["meta.type"] = "kickside.automation.trigger_mode",
})

local blocks, block_err = registry.find({
    [".kind"] = "registry.entry",
    ["meta.type"] = "kickside.block",
})
```

`.kind` and `.id` address top-level entry fields; `meta.type` addresses metadata.
For an exact id through the search API, use `{[".id"] = id}`. Prefer
`registry.get(id)` when the id is already known.

Registry operations run under the current actor and security scope. A result
being absent may mean it is not installed, does not match, or is not visible to
that caller. Do not retry under a broader scope or add a global registry grant
as a discovery workaround. Give the owning service the smallest registry grant
covering the declarations it is designed to expose.

### Search Metadata Is A Contract

Only search fields declared by the extension point. `meta.type`, `meta.class`,
and `meta.provider` are not interchangeable, and a tag is never a visibility
grant. If a new extension point needs discovery, define one stable type value,
validate its shape in the owning service, and document its exact query.

Do not make runtime correctness depend on titles, comments, icons, package
names, filename layout, or substring matching. Those are presentation and
authoring aids, not identity.

## Context: When To Use It And When Not To

There are three separate operations:

1. **Discover a declaration.** Search the registry by kind and declared
   metadata. No component context belongs in this query.
2. **Select a resource instance.** Query or open the component service under
   the current actor. This is where ownership and access are enforced.
3. **Invoke behavior for that instance.** Open the target contract binding for
   the component. The component layer supplies its private context and the
   declared `context_required` values, such as `component_id`.

For example, a connection provider is discovered as a `contract.binding`.
Creating it registers a component whose `impl_id` is that exact binding id.
Calling it later starts with the component id:

```lua
local component = require("component")

local connection, err = component.open(
    component_id,
    component.ACCESS.READ,
    "kickside.connection:connection"
)
if err then return nil, err end

return connection:get_status({})
```

The binding declares `context_required: [component_id]`; its implementation
reads `ctx.get("component_id")`. The caller does not search the registry for a
row whose metadata happens to contain that component id, and it does not pass a
forged actor or owner id in arguments.

Use context for instance-bound configuration that the contract explicitly
declares. Do not use it as a hidden alternative to typed input, as an ambient
bag of unrelated values, or as a way to bypass the component service.

### Actor Inheritance

Normal component opens, contracts, tools, Blocks, nested Dataflows, and resumed
Flows inherit the calling actor and scope through their canonical execution
path. A module must not invent `user_security_scope`, accept an actor id from a
tool argument, or elevate a failed lookup to control execution identity. A
module may expose a `user_security_scope` requirement only as app-owned policy
wiring that appends the host's user group to the module's own access policy; it
is not an actor-selection mechanism and never belongs on Dataflow execution.
Trusted `component.open_private` and system readers are infrastructure-only
paths for narrowly owned workers and teardown; feature code uses
actor-validated opens.

## Discover Tools Correctly

A callable Agent tool is not merely a Lua function. The canonical public-tool
predicate is all of:

```text
kind == function.lua
meta.type == tool
meta.public == true
meta.private is absent or false
```

Use the `kickside.agents:tools` contract for normalized, actor-visible tool
descriptors. Its `list` method supports namespace and tag filters; its `find`
method accepts one exact tool id. This service owns validation and visibility,
so callers do not duplicate the predicate.

An agent or in-app developer can use the Platform Manager's `list_tools`
action to search normalized titles, descriptions, ids, and tags. Keeper MCP has
its own session-level `list_tools`; activate the required trait first because
that list reflects the tools granted to the session, not every installed
function.

When authoring a tool, declare exact input and output schemas and call a domain
service or contract. Do not expose persistence functions directly. See
[Agents, Skills, And Models](06-agents-skills-models.md) for the complete entry.

## Discover Blocks Correctly

`kickside.blocks:blocks` is the canonical headless catalog. It validates exact
`kickside.block/v1` declarations and also projects actor-visible public tools
into virtual Blocks. This means a useful public tool does not need a duplicate
Block declaration merely to appear in a Flow builder.

Use:

- `resolve(exact_block_id)` when a definition already names a Block;
- `list({})` for normalized public descriptors;
- `plan({block_id, def_node_id, config})` to lower one instance into a native
  Dataflow node plan.

Raw `registry.find({["meta.type"]="kickside.block"})` is useful while auditing
declarations, but it does not replace catalog validation, tool projection, or
lowering. See [Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md).

## Create A Component Without Creating A Parallel Model

Use a component when the resource is independently owned, shared, opened,
rendered, configured, or deleted. Keep high-cardinality business records in
module-owned tables beneath a component root rather than creating a component
for every row.

The minimum component kind is one `contract.binding` that implements
`kickside.contract:component`. Its registry id becomes each instance's
`impl_id`. Create instances through `kickside.component:component_service`;
open them through the `kickside.component:component` client library; write
renderable state through `set_meta`; and keep credentials/configuration in
private context. Add `kickside.contract:deletable` when the instance owns data
outside the component tables.

The working [repository scaffold](../../README.md) demonstrates a
small module and test harness. [Component Development](01-component-development.md)
describes lifecycle, access, metadata, provision, and teardown.

## Discovery Sequence

Before writing a new declaration:

1. Search the Hub by capability and read the candidate module README.
2. Use Hub dependency `plan` with `include_entries` to inspect the exact ids,
   kinds, comments, and requirements without installing it.
3. In a running app, search the registry by the extension point's canonical
   kind and `meta.type`.
4. Fetch the closest exact entry and its root `ns.definition`.
5. Find the owning catalog/contract service and use its normalized list or
   resolve method.
6. Copy the nearest current pattern into an independent module; change ids,
   schemas, behavior, tests, and UI deliberately.
7. Prove standalone lint/tests, sidecar assembly, actor isolation, and package
   install/update before publishing.

If you cannot name the declaration's owner, exact id, discovery predicate,
validation service, context source, and access boundary, it is not ready to
implement.

## Failure Patterns

- Deriving `userspace.users` from package `userspace/users` instead of reading
  its root namespace.
- Searching by title or directory name, then persisting whichever id was first.
- Using `registry.find` to locate a component instance.
- Adding `component_id` metadata to declarations so instance calls can find
  them.
- Calling every `meta.type: tool` function without the public/private policy.
- Duplicating a public tool as a Block instead of using canonical projection.
- Passing actor, owner, or security scope in tool arguments.
- Opening private component context from an ordinary feature handler.
- Adding fallback heuristics when a declaration or required context is absent.

Missing identity or context is a declaration/wiring error. Fail clearly, fix
the declaration, and add the missing test; do not compensate at runtime.
