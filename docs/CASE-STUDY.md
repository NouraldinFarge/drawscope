# Case study: testing a lottery pattern without turning it into a prediction

## The problem

Historical lottery data contains an effectively unlimited supply of apparent patterns.
Numbers can look “hot,” “overdue,” seasonal, weekday-dependent, clustered after a prior
draw shape, or unusually strong under a hand-tuned mixture of signals. If the same
winning draw helps choose and grade the pattern, the result can look persuasive while
measuring nothing beyond hindsight.

DrawScope was built to make that failure visible. It combines a traceable offline
archive with a forward-only evaluation protocol and a deliberately conservative result
language.

## The worked example

The versioned [Powerball evidence bundle](../examples/powerball-retrospective-v0.6.5/README.md)
runs through the actual packaged `DrawScope.exe` → `drawscope-engine.exe` boundary. It
binds the result to DrawScope `0.6.5`, methodology `1.3.0`, engine contract `1.0`, the
41,598-draw archive, and database SHA-256
`89a9370d4dcbba7a6ca22e218e4ed6ba6ff1a960b5c1247f3f3f4a0a4569662f`.

For every historical target in the bounded walk-forward test, the engine reconstructs
30 fixed number-ranking signals from earlier draws only. Those signals cover frequency,
recency, exponentially decayed history, momentum, calendar groupings, relative gaps,
previous-draw transitions, and ticket-shape context. The target result does not
participate in its own ranking.

The first chronological 60% of trials is the discovery segment. DrawScope compares the
declared candidate strategies there, freezes the strongest strategy once, and evaluates
it on the later 40% confirmation segment. Changing confirmation outcomes cannot change
which strategy was selected. Ties use neutral ranks and an outcome-independent SHA-256
cutoff order.

## What the result means

The evidence bundle reports the selected strategy's confirmation lift, one-sided
significance estimate, block stability, and a bounded 0–49 historical-confidence score.
The score is not a chance of winning. It cannot cross 49 without a separately specified
prospective protocol and results that did not exist while the strategy was developed.

The permitted conclusion remains intentionally narrow: the retrospective test either
supports continued historical experimentation or says not to use the pattern to choose
numbers. It never changes Powerball's published theoretical jackpot odds, and it does
not generate a claim that the next draw is predictable.

## Why the packaged boundary matters

A screenshot proves only that a screen existed. The evidence JSON proves more:

- the application and analytics versions involved;
- the strict cross-process contract;
- the archive draw count, byte size, date, and SHA-256 identity;
- the target, sample, fixed seed, signal count, and trial limit;
- the complete structured analytical result;
- the anti-leakage assertions used by the release verifier.

The build exports this evidence from the packaged executable, validates its invariants,
applies the repository's canonical JSON formatting, and requires it to be byte-identical
to the committed version-bound example. The public landing page reads those verified
values; its build stops if the evidence is missing or does not match the manifest.

## What this does not solve

Thirty exploratory signals are correlated, and one chronological split cannot replace
preregistration, multiplicity correction, prospective collection, or independent
replication. Source archives can be incomplete or stale. Historical association does
not overcome the design of an independent random drawing.

That is the point of the case study: a useful analytical product should make an
unexciting answer easier to trust than an exciting answer assembled after the fact.

## Reproduce and inspect

1. Start with the [evidence bundle](../examples/powerball-retrospective-v0.6.5/README.md).
2. Review the [statistical methodology](METHODOLOGY.md) and
   [known limitations](KNOWN-LIMITATIONS.md).
3. Confirm the archive identity in
   [`data/offline-database-manifest.json`](../data/offline-database-manifest.json).
4. Run the [testing matrix](TESTING.md) and the packaged evidence verifier.
5. Read the [responsible-use boundary](RESPONSIBLE-USE.md) before interpreting any score.
