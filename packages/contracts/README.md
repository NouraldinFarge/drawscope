# DrawScope contracts

This workspace package is the versioned schema boundary between React, Rust, and the
Python analytics sidecar.

- `schemas/v1/` contains the canonical JSON Schemas.
- `examples/` contains accepted and rejected cross-language fixtures.
- `src/` exposes strict Zod validators and TypeScript types.
- `tests/` verifies schema/Zod agreement and nested unknown-property rejection.

```powershell
pnpm contracts:test
```

Protocol changes must preserve strictness, update every language adapter and fixture,
and either remain compatible with contract `1.x` or deliberately introduce a new major
directory. See [the contract documentation](../../docs/CONTRACTS.md).
