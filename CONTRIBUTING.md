# Contributing

DrawScope welcomes focused bug reports and narrowly scoped improvements that preserve its local-first, retrospective-research boundaries.

## Choose the right entry point

- Reproducible application problem: use the bug-report issue form.
- Incorrect draw, date, source, coverage, or gap: use the archive/provenance form.
- Bounded workflow improvement: use the feature-request form.
- Suspected vulnerability: use private vulnerability reporting, never a public issue.

Read [`SUPPORT.md`](SUPPORT.md) before filing installation or usage questions.

## Before opening a pull request

1. Open an issue describing the problem and proposed boundary.
2. Do not add private data, credentials, scraped material, generated output, or third-party data without documented redistribution rights.
3. Keep claims descriptive and auditable; DrawScope does not claim to predict future outcomes.
4. Keep changes focused. Separate product behavior, dependency maintenance, and presentation-only work when they need different verification.
5. Update the relevant contract, fixture, methodology, provenance record, screenshot, or limitation whenever the public claim changes.

## Local verification

```powershell
pnpm install --frozen-lockfile
pnpm verify
cargo test --workspace --locked
uv sync --project engines/drawscope-engine --frozen --all-groups
uv run --project engines/drawscope-engine pytest
```

Pull requests should explain the user-facing behavior, tests, data-provenance impact, and any security-boundary change.

## Review standard

A change is ready only when a reviewer can trace its claim to executable behavior and verification evidence. New analytics must define the time boundary, prevent target leakage, state the chance baseline, and retain a clear non-predictive interpretation.
