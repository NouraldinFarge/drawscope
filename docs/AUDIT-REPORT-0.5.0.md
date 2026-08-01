# DrawScope 0.5.0 retrospective analytics audit

## Outcome

DrawScope 0.5.0 adds a leakage-free retrospective Powerball pattern lab under
methodology 1.1.0. A user can leave the target date blank to test the latest archived
winner or select an eligible historical winning date. Every displayed score is built
from drawings strictly earlier than the target.

The analysis is descriptive and experimentally backtested. It does not label a
historical pattern as a prediction or alter the official probability of a valid
future ticket.

## Implemented analysis

- fourteen fixed number-level signals covering long-term frequency, three recent
  windows, weekday, month, season, day and phase of month, year-to-date, previous
  year, current gap, previous-draw repeat, and previous-draw adjacency
- pool-wide z-score standardization and fixed weights totaling 1.0
- tie-neutral midrank percentiles plus deterministic composite ranks
- pre-draw evidence rows for every winning main number and the Powerball
- ticket-shape analysis for sum percentile, parity rate, consecutive values,
  immediate repeats, and prior winning-pair occurrences
- an expanding-window walk-forward test over as many as 250 hidden targets
- observed top-five hits against the hypergeometric chance expectation
- z-score, two-sided p-value, lift, winning-number percentile, and bounded evidence
  grade

## Leakage and overfitting controls

1. The target must have at least 30 earlier drawings.
2. Target lookup occurs after the complete archive is sorted chronologically.
3. Every score receives only the slice ending immediately before its target.
4. The walk-forward loop reconstructs every signal separately for each hidden draw.
5. Signal definitions and weights are source constants, not selected for the target.
6. Tied signals use midranks so numeric tie-breaking does not inflate percentiles.
7. The p-value applies only to the fixed composite top-five outcome.
8. Individual calendar rows remain explicitly exploratory and correlated.

## Real-archive observation

The release was exercised on all 1,365 drawings in the current Powerball rule era.
For the latest archived target, 2026-07-27:

- target main numbers: 6, 26, 46, 58, 65
- target Powerball: 25
- earlier drawings available: 1,364
- walk-forward targets: 250, covering 2024-11-04 through 2026-07-27
- observed top-five hits per draw: 0.4120
- chance expectation: 0.3623
- observed/expected ratio: 1.1371
- winning-number average percentile: 51.06
- z-score: 1.3967
- two-sided p-value: 0.162492
- evidence grade: within chance range

This is the intended honest outcome: some historical lift appeared in the selected
sample, but it was not statistically unusual under the fixed chance comparison.

## Contract and runtime hardening

- the strict engine request declares the optional target date and a 30–1,000 bounded
  backtest limit
- the result contract requires number, ticket, signal, backtest, and interpretation
  fields
- main and special numbers are validated against the selected era
- the native health check requires a non-empty 250-draw packaged backtest
- the one-click release gate validates methodology 1.1.0, sample size, jackpot odds,
  and backtest count before promotion
- the engine remained within the existing 30-second native timeout; the active
  packaged health analysis completed in 4.726 seconds on the release machine

## Verification

- TypeScript/React: 6 tests passed
- Python analytics/protocol: 12 tests passed
- Rust native/source adapter: 12 tests passed
- formatting, linting, TypeScript checking, strict mypy, and Clippy with warnings
  denied passed
- browser interaction and desktop visual review passed
- packaged app/database health passed in original, renamed, moved, candidate, and
  active portable layouts
- SQLite integrity check returned `ok`
- active database retained 41,598 drawing rows
- portable SHA-256 matched the published checksum and release metadata

## Deliberate boundary

The retrospective screen currently applies to the current Powerball rule era. Other
unordered games need era-aware selectors, while Pick 3 and Pick 4 need
position-specific ordered-digit models; reusing this main-ball ranking unchanged
would be statistically misleading.
