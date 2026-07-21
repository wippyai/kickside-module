# Contributing

Read `AGENTS.md`, create a focused branch, and run `make verify` before opening
a pull request. Persistence changes also require `make test-pg` against the
provided disposable PostgreSQL service.

Pull requests must explain the registry owner and contract being changed,
include tests for public behavior, regenerate `static/` from `ui/src`, and avoid
unrelated formatting or compatibility layers. Never commit credentials or
local Wippy state.
