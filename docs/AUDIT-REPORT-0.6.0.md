# DrawScope 0.6.0 expanded-pattern audit

Date: 2026-07-28  
Methodology: 1.2.0  
Scope: Pattern Lab, Python analytics engine, typed contract, native bridge, release
health gates, documentation, and visual review.

## Outcome

The Pattern Lab now evaluates 30 fixed pre-draw signals across rolling frequency,
exponential decay, momentum, calendar cycles, year windows, gaps, previous-draw
relationships, and transitions. Ticket-shape analysis now includes pairs, triples,
sum, spread, dispersion, parity, low/high balance, prime counts, multiples of three,
same-ending pairs, consecutive runs, and previous-draw repeats.

The engine does not select and grade a pattern on the same data. It uses the first
60% of bounded chronological walk-forward trials for discovery, freezes the
best-performing candidate, and evaluates that one candidate on the final untouched
40%. The confidence score is an evidence rating, not a winning probability. It cannot
exceed 49/100 until a prospectively registered method is tested on future drawings.

## Real archive result

The native application successfully analyzed 1,365 current-era Powerball drawings and
completed 250 walk-forward trials from 2024-11-04 through 2026-07-27.

| Measure | Observed result |
|---|---:|
| Fixed 30-signal composite mean top-five hits | 0.404 per draw |
| Chance expectation | 0.3623 per draw |
| Composite lift | 1.115× |
| Composite two-sided p-value | 0.241267 |
| Discovery-selected pattern | Last 10 versus preceding 10 |
| Discovery trials / lift | 150 / 1.2144× |
| Untouched confirmation trials / lift | 100 / 1.1040× |
| Confirmation winning-number percentile | 52.78% |
| Confirmation one-sided p-value | 0.251427 |
| Confirmation blocks above chance | 2 of 4 |
| Final confidence rating | 4/100 — Very low |

The selected pattern's pre-target counterfactual ticket was main numbers
`4, 5, 9, 29, 36` with Powerball `1`. It matched zero of the five main numbers and did
not match the Powerball in the 2026-07-27 target drawing.

The measured effect is statistically compatible with ordinary random variation.
DrawScope therefore displays `Do not use this pattern to choose numbers.` The result
does not change the theoretical probability of any valid future ticket.

## Validation evidence

- 7 TypeScript interface and contract tests passed.
- 14 Python analytics and protocol tests passed.
- 13 Rust native, import, query, path, bounded pipe, and bridge tests passed.
- Biome formatting/linting, TypeScript project references, Ruff formatting/linting,
  strict mypy, Rust formatting, and Clippy with warnings denied passed.
- Native-to-engine full-archive health passed with app version 0.6.0, methodology
  1.2.0, 30 signals, 250 backtests, confidence 4/100, and exact jackpot odds of
  1 in 292,201,338.
- The Pattern Lab was interactively rendered and visually inspected at desktop size.

## Responsible-use conclusion

The expanded search can describe and rigorously test more historical structure, but
it did not establish a repeatable predictive edge. The honest final confidence in
using the current best historical pattern to choose a winning number is **4/100
(Very low)**.
