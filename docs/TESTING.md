# Testing and quality gates

`pnpm verify` runs Biome formatting/linting, TypeScript project references, contract validation, and Vitest. Python uses Ruff format/lint, strict mypy, and pytest. Rust uses format, check, Clippy with warnings denied, and tests.

Current regression fixtures cover:

- JSON Schema/Zod agreement and additional-property rejection
- non-predictive responsible-use UI copy
- frequency, gap, pair, deterministic simulation, and special-ball separation
- full jackpot-odds calculation including the special-ball pool
- target-date leakage prevention and minimum historical-sample enforcement
- expanded calendar, recency, decay, momentum, transition, gap, and previous-draw signals
- expanded ticket-shape fields including triples, spread, dispersion, primes, low/high
  balance, multiples of three, endings, and consecutive runs
- fixed 30-signal weights, discovery-only best-pattern selection, untouched
  chronological confirmation, and walk-forward result bounds
- confirmation significance bands, block stability, responsible recommendations, and
  the 49-point pre-prospective confidence cap
- malformed unordered duplicate input
- JSONL health protocol
- monotonic event sequencing on analytical failures
- Rust path traversal/absolute-path denial
- strict drawing-query bounds and full-archive Powerball ticket profiling
- strict native-to-engine request shape and redacted terminal-code mapping
- bundled catalog/fixture deserialization and Powerball era validation
- offline SQLite integrity, foreign keys, duplicate keys, game coverage, source hashes,
  and main-number cardinality

The portable build adds offline-seed presence and merge checks, archive-entry checks,
installer-artifact denial, app/database and analytics-engine health launches from a
path with spaces, an end-to-end full-archive native-to-engine analysis, a 250-draw
retrospective 30-signal pattern backtest, a structurally valid capped best-pattern
confidence result, rename/move checks, flat active layout, user-data preservation,
and rollback.
