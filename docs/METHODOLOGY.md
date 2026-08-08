# Statistical methodology 1.3.0

## Principles

1. Filter by verified coverage and one compatible era before calculation.
2. Keep main balls, special balls, add-on drawings, sessions, and ordered positions separate.
3. Label formula, date range, sample size, era, coverage, and methodology.
4. Never use a target drawing or any later drawing to construct its score.
5. Select a candidate pattern on one time period and evaluate it on a later untouched period.
6. Report effect size, stability, and uncertainty rather than a high rank alone.
7. Treat the final confidence rating as historical evidence—not winning probability.
8. Prefer “do not use to choose numbers” when confirmation does not support an edge.

## Full-archive descriptive measures

- frequency and appearance rate
- current gap in eligible drawings
- pair co-occurrence
- draw sums and odd/even composition
- presence of consecutive values
- Pearson chi-square descriptive statistic
- deterministic Monte Carlo marginal-frequency baseline
- exact combination count including the special-ball matrix

## Thirty number-ranking signals

For a selected target draw at index `t`, only draws `1…t−1` are visible. Every
eligible number receives these predeclared signals:

1. all prior drawings
2. previous 5 drawings
3. previous 10 drawings
4. previous 20 drawings
5. previous 30 drawings
6. previous 50 drawings
7. previous 100 drawings
8. previous 250 drawings
9. exponentially weighted frequency with a 5-draw half-life
10. exponentially weighted frequency with a 20-draw half-life
11. exponentially weighted frequency with a 100-draw half-life
12. frequency momentum in the last 10 versus the preceding 10
13. same weekday
14. same calendar month
15. same meteorological season
16. same calendar quarter
17. same day of month
18. same early/middle/late part of month
19. same week of month
20. nearby ISO week of year
21. current calendar year to date
22. previous calendar year
23. drawings since last appearance
24. current gap divided by the number’s historical mean interval
25. presence in the immediately previous draw
26. numerical adjacency to a previous-draw number
27. shared last digit with a previous-draw number
28. historical frequency after a draw containing current previous-draw values
29. historical frequency after a similar previous-draw sum band
30. historical frequency after the same previous-draw parity shape

Each signal is standardized across the eligible pool with a population z-score. The
fixed weights total 1.0. Composite score is:

`score(n,t) = Σ weightⱼ × z(signalⱼ(n), history before t)`

Midrank percentiles and competition ranks handle equal scores without favoring
lower-numbered balls. When a tied score crosses a top-five or ticket-selection cutoff,
methodology 1.3 uses SHA-256 over the declared methodology, game, era, target date,
ball role, strategy key, and candidate number. This deterministic order is fixed before
the winner is compared, contains no random state, and is independent of winning values.
The interface also exposes the five largest weighted contributions for each winner.

## Expanded ticket-shape analysis

The selected winning combination is compared with earlier tickets using:

- sum and sum percentile
- odd/even shape
- consecutive-number presence and maximum run length
- overlap with the immediately previous draw
- pair and triple occurrence counts
- range spread and population standard deviation
- low/high balance
- prime-number count
- multiples-of-three count
- same-ending pair count

These are descriptive combination shapes. They do not change the probability of an
individual valid combination.

## Walk-forward test

The engine performs as many as 250 expanding-window trials. For every trial it hides
the target, rebuilds all 30 signals from earlier drawings, and records:

- top-five hits for each individual signal
- top-five hits for the fixed weighted composite
- average winning-number percentile
- special-ball composite percentile

For a fair 5/69 drawing, a five-number ranking has expected hits:

`5 × 5 / 69 = 0.3623 per draw`

The variance uses the corresponding hypergeometric distribution. The fixed composite
receives a full-window z-score and two-sided p-value.

## Best-pattern selection and confirmation

The chronological walk-forward observations are split once:

- first 60%: discovery
- final 40%: untouched confirmation

The candidate with the greatest discovery-period top-five lift is frozen by a dedicated
selection function that receives only the discovery prefix. Ties use discovery
winning-number percentile and stable declared order. Confirmation observations cannot
change the selected key, and no candidate is reselected after confirmation is visible.

The chosen pattern receives:

- discovery and confirmation lift
- confirmation average hits and winner percentile
- confirmation z-score and one-sided p-value for above-chance performance
- stability across as many as four chronological confirmation blocks
- the numbers it would have selected before the retrospective target

## Confidence rating

The 0–49 score rates confidence in a repeatable historical ranking advantage. It is
not the probability of choosing a winner.

- confirmation lift at or below 1.0: `0`, no demonstrated edge
- one-sided p-value at least 0.10: `1–9`, very low
- p-value 0.05–0.10: `10–19`, low
- p-value 0.01–0.05: `20–29`, preliminary
- p-value 0.001–0.01: `30–39`, tentative historical only
- p-value below 0.001: `40–49`, tentative historical only

Effect size and the proportion of positive confirmation blocks determine placement
inside a band. A retrospective-only score can never reach 50. Crossing 50 requires a
separately specified prospective test on future drawings unavailable during
development.

Scores below 20 produce the recommendation “do not use this pattern to choose
numbers.” Scores from 20 through 49 remain “historical experiment only.”

## Planned guarded methods

Position-specific ordered-game models, jackpot/expected-value modeling, formal anomaly
batteries, false-discovery-adjusted exploratory hypothesis reports, and prospective
registered validation will be added only with independent fixtures and explicit
coverage handling.
