# Contributing

DrawScope welcomes focused bug reports and narrowly scoped improvements that preserve its local-first, retrospective-research boundaries.

## Before opening a change

1. Open an issue describing the problem and proposed boundary.
2. Do not add private data, credentials, scraped material, generated output, or third-party data without documented redistribution rights.
3. Keep claims descriptive and auditable; DrawScope does not claim to predict future outcomes.

## Local verification

```powershell
pnpm install --frozen-lockfile
pnpm verify
cargo test --workspace --locked
uv sync --project engines/drawscope-engine --frozen --all-groups
uv run --project engines/drawscope-engine pytest
```

Pull requests should explain the user-facing behavior, tests, data-provenance impact, and any security-boundary change.

