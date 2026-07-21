# Security policy

Do not open a public issue containing credentials, private customer data, or a
working exploit. Use GitHub's private vulnerability reporting for this
repository or contact the Wippy maintainers through the security channel listed
by the organization.

Before publishing a derived module:

- run `make release-check`;
- inspect the Git diff and tracked-file list;
- keep Hub tokens, provider keys, `.env`, `.wippy/`, databases, and module packs
  outside Git;
- use least-privilege endpoint policies and authenticated routers;
- validate untrusted input at the contract/API boundary;
- parameterize SQL and avoid logging private payloads.

The test PostgreSQL credentials in `compose.test.yaml` are disposable local
fixtures and must never be reused in a deployment.
