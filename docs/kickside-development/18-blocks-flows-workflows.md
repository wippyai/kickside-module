# Blocks, Flows, Workflows, And Ports

This page defines the executable-composition vocabulary. These terms are not
interchangeable.

- **Block**
  - **Contract:** `registry.entry`, `meta.type: kickside.block`, `data.block.api_version: kickside.block/v1`
  - **Owns:** One typed executable capability
- **Flow**
  - **Contract:** One native Dataflow DAG and its durable run state
  - **Owns:** Execution, nesting, parking, signals, recovery
- **Workflow**
  - **Contract:** A user-owned, versioned visual definition
  - **Owns:** Authoring, validation, publishing, run history
- **Port**
  - **Contract:** A named connection point
  - **Owns:** A Block result route or an Automation source/destination
- **Automation**
  - **Contract:** A configured, ongoing product behavior
  - **Owns:** Trigger and domain lifecycle

## Block

A Block is one exact capability declaration. It owns:

- object schemas for `input`, `config`, and `output`;
- an optional `error` schema;
- explicit output ports;
- display-only presentation metadata;
- exactly one execution target: `function`, `agent`, or `wait`.

A Block lowers directly to one native Dataflow node. There is no Block wrapper
executor and a Block does not return another graph. The caller that composes a
Flow owns the DAG; Blocks supply validated node plans.

Minimal function Block:

```yaml
- name: block.enrich
  kind: registry.entry
  meta:
    type: kickside.block
    public: true
    title: Enrich record
  data:
    block:
      api_version: kickside.block/v1
      input:
        type: object
        additionalProperties: true
      config:
        type: object
        additionalProperties: false
        properties:
          mode: { type: string, enum: [fast, thorough] }
      output:
        type: object
        additionalProperties: true
      error:
        type: object
        required: [code, message]
        properties:
          code: { type: string }
          message: { type: string }
      ports:
        - { id: result, label: Result, direction: out }
        - { id: failed, label: Failed, direction: out }
      presentation:
        category: Data
        icon: tabler:sparkles
        hue: blue
      execution:
        kind: function
        function_id: acme.enrichment:run
```

The function receives exactly `{ input, config }`. Its declaration is closed:
unknown fields fail validation. A `failed` port and `error` schema must be
declared together.

Public registry tools are projected as virtual Blocks by `kickside/blocks`.
Their function id and JSON schemas stay authoritative; do not duplicate a tool
as a second Block declaration.

## Flow

A Flow is an executable Dataflow DAG. It is the single durable execution state
for every node in the graph, including nested nodes. Dataflow owns scheduling,
node data, nesting, parking, signaling, and restart recovery.

Headless composition does not require `kickside/workflows`:

1. Discover or resolve exact Blocks through `kickside.blocks:blocks`.
2. Validate instance config.
3. Lower each Block to one native node plan.
4. Assemble those plans and edges into one Dataflow command stream.
5. Start the Flow under the caller's actor and scope.

The application binds Dataflow's execution-identity contract to
`kickside.core.execution:execution_identity`. A deferred or restarted Flow
reconstructs that frozen identity; it does not select an application-wide user
scope.

## Durable Human Wait

A wait Block lowers to `kickside.blocks:await`. The node commits its park
before invoking an optional provider-owned arm. A callback resumes it with the
Flow id and the native signal id through `kickside.blocks:resume`.

This remains true when the wait is below an Agent node or nested Flow:

- the concrete node id, not the declaration id, is the durable signal identity;
- the park belongs to the one Dataflow state;
- the Flow's persisted execution identity authorizes resume;
- restart recovery reconstructs that identity before the orchestrator resumes.

`kickside.inbox:block.review` is the reference implementation: Inbox owns
assignment and the review item; Blocks/Dataflow own parking and signaling.
Visual Workflows is not a dependency of the Inbox Block.

## Workflow

`kickside/workflows` is the optional visual authoring and lifecycle plugin.
A Workflow is a component whose authoritative definition is its event stream.
Published versions are immutable. Its executable nodes are exact Blocks or
exact published nested Workflows.

Start, Finish, Error, Condition, Loop, For each, and Combine are structural
nodes. Start, Finish, and Error compile into routing boundaries; they are not
placeholder functions.

Publishing folds and validates the document, freezes the compiled version, and
records the version. Launch remints native node and data ids for an independent
Dataflow run. The UI is one consumer of the same Block catalog; it does not own
Block execution.

## Ports

Port is one word with two precise declaration locations:

- A **Block output port** lives in `data.block.ports`. It routes the result of
  one Block instance inside a Flow. Block ports currently have
  `direction: out`.
- An **Automation port** is a standalone `registry.entry` with
  `meta.type: kickside.automation.port`. It exposes a source or Destination
  backed by an event, `kickside.data:pullable`, or
  `kickside.data:writable` binding.

Do not declare ports in a binding's `meta.ports`. The standalone Automation
port is the discoverable catalog record; the binding remains the callable
contract implementation.

Use a Block for an executable step in a Flow. Use an Automation port when an
ongoing Automation must connect to an external source or Destination. A module
may publish both when both surfaces are real.

## Ownership Boundaries

- `kickside/blocks`: Block contract, discovery, validation, lowering, durable
  wait and resume.
- `wippy/dataflow`: Flow runtime state and orchestration.
- `kickside/workflows`: optional visual definitions, publishing, compiler,
  and Workflow run UI.
- Product modules: their own Blocks, Automation ports, contracts, events, and
  provider-specific wait arms.

This separation lets a module publish reusable business capabilities without
depending on the visual Workflow product.
