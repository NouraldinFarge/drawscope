# DrawScope analytics engine

This Python 3.12 package is the deterministic analytics sidecar used by the Windows
desktop application. It communicates through a strict, line-bounded JSONL protocol and
writes machine-readable events to standard output only.

The engine computes archive descriptors, exact jackpot odds, seeded simulations, ticket
shape context, 30 fixed historical signals, and a forward-only walk-forward evaluation.
It does not claim that historical patterns predict independent future drawings.

```powershell
uv sync --frozen --all-groups
uv run ruff format --check .
uv run ruff check .
uv run mypy
uv run pytest
```

Read the [methodology](../../docs/METHODOLOGY.md),
[responsible-use policy](../../docs/RESPONSIBLE-USE.md), and
[packaged case study](../../docs/CASE-STUDY.md) before interpreting a result.
