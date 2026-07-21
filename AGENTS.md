# Kickside module operating contract

This file defines the development and release requirements for this
repository.

## First five minutes

1. Read `README.md`.
2. Run `node scripts/check-module.mjs` before editing.
3. If `.kickside-module.json` says `initialized: false`, initialize exactly
   once with `make init ORG=... MODULE_NAME=... TITLE="..."`.
4. Read `docs/kickside-development/19-discovery-addressing-and-context.md`.
5. Read the handbook page for the surface you will change. Frontend work also
   requires `frontend/frontend-handbook.md` and `frontend/app-checklist.md`.
6. Locate an installed or published example before adding a new registry kind.
   Use the registry definition and owning contract.

## Commands

```bash
make verify          # setup + invariants + lint + typecheck + build + SQLite
make postgres-up
make test-pg         # required for SQL or migration changes
make postgres-down
make release-check   # full verification + authenticated publish dry run
make publish         # private by default
```

Do not weaken a check to land a change. Fix the source or correct the check
when its stated invariant is objectively wrong.

## Identity model

- Package identity: `organization/module`, declared by `wippy.yaml`.
- Root registry namespace: declared by the package's one root `ns.definition`.
- Entry identity: exact `namespace:name`.
- Component identity: runtime UUID owned by `kickside.component`; it is not a
  registry entry ID.
- A folder name has no identity authority.

Known entries use `registry.get(exact_id)`. Family discovery uses
`registry.find` with both entry kind and canonical `meta.type`. Runtime
component instances are discovered through the component contract, never by
searching registry declarations.

## Dependency and ownership rules

- Declare every real dependency as `ns.dependency` in source.
- Use `version: "*"` or a genuine compatibility range. Never copy an exact
  resolved version from a lock into source.
- Lock files are allowed and expected to contain exact versions and hashes.
- Use `ns.requirement` only for a host-owned resource genuinely supplied by
  the application. Give it a truthful comment and exact rewrite targets.
- Do not add guessed defaults, heuristic namespace conversion, legacy
  fallbacks, duplicate declarations, or compensating ownership code.
- One package owns each declaration. Consumers bind or depend on it; they do
  not clone it.

## Security and execution

- Dataflow, agent, Block, and nested execution inherit the calling actor.
  Never inject or synthesize a user scope to choose an execution identity.
- A module may accept a host role-group requirement only to append that group
  to the module's own endpoint policy, as this starter does.
- Public endpoints require an intentional public router and explicit threat
  review. Product endpoints use the authenticated router and endpoint policy.
- Never log tokens, credentials, private component context, authorization
  headers, or full user payloads.
- Secrets enter through runtime environment/storage. They never appear in
  YAML defaults, tests, fixtures, documentation, commits, or screenshots.

## Data and event model

- Migrations contain explicit SQLite and PostgreSQL implementations with
  reversible `down` behavior where the framework supports it.
- Repositories acquire and release database handles on every path.
- Parameterize values. Do not concatenate user data into SQL.
- Writes emit durable facts; projections materialize them asynchronously.
- Read endpoints read the committed read model. They never synchronously
  catch up, poll, or gate on a thread projection.
- Defaults that define product catalogs belong in registry declarations, not
  seed migrations.

## Blocks, flows, workflows, and automation

- A Block is one typed executable capability with declared input/config/output.
- A Flow is the native Dataflow DAG and durable run state; it may nest and
  park on signals or approvals while preserving actor identity.
- A Workflow is an optional user-owned visual definition that lowers to a
  Flow. Visual Workflows do not own reusable execution semantics.
- An Automation is configured ongoing behavior around a trigger and domain
  lifecycle.
- A Port is a typed source or destination connection point.
- Publish reusable business capability as a Block/contract/port so programs
  and agents can compose it without the visual Workflows module installed.

## Frontend contract

- `ui/package.json` must retain `specification: wippy-component-1.0`.
- Web components are library builds with `formats: ['es']`,
  `preserveEntrySignatures: false`, and module-level
  `define(import.meta.url, ElementClass)`.
- Keep `@wippy-fe/theme` and webcomponent runtime libraries bundled. Externalize
  only host peers declared by the package.
- Registry metadata is authoritative: tag, props, description,
  `announced: true`, and `auto_register: true` must match the package.
- Use `@wippy-fe/proxy`; never construct raw host postMessage protocols,
  peer-module URLs, or deployment-layout paths.
- Use semantic theme tokens. State colors use danger/success/warn/info/help;
  raw palette colors and fake tokens such as `--p-red-500` are forbidden.
- Every subscription returns a disposer and is released on unmount. Every
  icon-only button has an accessible label. Use actual buttons for actions.
- Edit `ui/src`, run the build, and commit the regenerated `static/` output.

## Testing expectations

- Colocated logic tests use `test.run_cases`; registering describes without
  executing the wrapper is not a test.
- The standalone harness owns host resources and requirements. Product source
  must not contain harness stubs.
- Every persistence or migration change passes both SQLite and PostgreSQL.
- Registry wiring tests assert exact entry IDs and cross-references.
- User-visible or API behavior needs an end-to-end exercise against a live,
  source-free Kickside host when standalone tests cannot represent actor or
  host behavior.

## Publishing

- `wippy auth login` stores Hub credentials outside the repository.
- `make publish` is private by default. Use `VIS=public` only when publication
  is intentional and documentation/licensing are ready.
- Source manifests do not pin the next release version. The Hub publisher
  selects it; immutable releases and locks provide reproducibility.
- Run `make release-check`, inspect `git diff`, ensure `git status` is clean,
  then publish from the default branch only.

## Definition of done

- Identity and dependency checks pass.
- Wippy lint passes.
- Behavioral tests pass on SQLite and PostgreSQL when data is touched.
- Vue type-check and production build pass.
- `static/` matches `ui/` and contains `wippy-meta.json`.
- No credential-like material or generated local state is tracked.
- Documentation describes any new public contract and links resolve.
- The change has one clear owner and contains no compatibility residue.
