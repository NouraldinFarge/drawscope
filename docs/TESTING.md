# Testing and quality gates

`pnpm verify` synchronizes manifest-driven presentation claims, builds the static project
site from version-bound evidence, checks documentation links and generated-site
invariants, runs Biome formatting/linting, validates TypeScript project references, and
runs Vitest. Python uses Ruff format/lint, strict mypy, and pytest. Rust uses format,
check, Clippy with warnings denied, and tests.

Current regression fixtures cover:

- JSON Schema/Zod agreement, production strictness, and nested additional-property rejection
- non-predictive responsible-use UI copy
- frequency, gap, pair, deterministic simulation, and special-ball separation
- full jackpot-odds calculation including the special-ball pool
- target-date leakage prevention and minimum historical-sample enforcement
- expanded calendar, recency, decay, momentum, transition, gap, and previous-draw signals
- expanded ticket-shape fields including triples, spread, dispersion, primes, low/high
  balance, multiples of three, endings, and consecutive runs
- fixed 30-signal weights, discovery-only best-pattern selection, confirmation-mutation
  invariance, untouched chronological confirmation, and walk-forward result bounds
- confirmation significance bands, block stability, responsible recommendations, and
  the 49-point pre-prospective confidence cap
- malformed unordered duplicate input, duplicate draw dates, and inconsistent
  special-ball rules
- tie-neutral midranks/competition ranks and reproducible outcome-independent SHA-256
  selection cutoffs
- JSONL health protocol
- monotonic event sequencing on analytical failures
- Rust path traversal/absolute-path denial
- responsive drawer focus entry, background inertness, Escape restoration, and route
  focus recovery
- strict drawing-query bounds and full-archive Powerball ticket profiling
- strict native-to-engine request shape, native result invariants, strict UI result
  parsing, and redacted terminal-code mapping
- bundled catalog/fixture deserialization and Powerball era validation
- offline SQLite integrity, foreign keys, duplicate keys, game coverage, source hashes,
  and main-number cardinality
- machine-readable archive-freshness policy/coverage agreement
- packaged evidence identity, execution boundary, methodology, archive hash, leakage
  assertions, trial bounds, recommendation vocabulary, and confidence cap
- README, hero, social card, landing-page, version, manifest, archive-table, direct
  download, generated-site, metadata, and local-link consistency

The portable build adds two byte-identical frozen database/manifest rebuilds,
offline-seed presence and merge checks, archive-entry checks,
installer-artifact denial, app/database and analytics-engine health launches from a
path with spaces, an end-to-end full-archive native-to-engine analysis, a 250-draw
retrospective 30-signal pattern backtest, a structurally valid capped best-pattern
confidence result, a complete packaged evidence export, rename/move checks, flat active
layout, user-data preservation, and rollback.

With `-BuildInstaller`, the release qualification also installs NSIS into an explicit
guarded temporary path, verifies all installed resources, runs app and analytics health,
uninstalls, and proves the user database remains. With `-RequireAuthenticode`, it checks
the signatures on the app, sidecar, and installer before publication.

The weekly freshness workflow is deliberately separate from CI: a dated snapshot can be
valid and reproducible while still needing refresh attention. CI validates the policy
and evidence; the scheduled workflow reports age and maintains the operational issue.
