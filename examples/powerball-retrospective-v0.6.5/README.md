# Packaged Powerball retrospective · DrawScope 0.6.5

This directory contains a complete, version-bound analytical result produced through the packaged `DrawScope.exe` → `drawscope-engine.exe` boundary. It is a reproducibility artifact, not a prediction or a recommended ticket.

## Evidence identity

| Field | Value |
| --- | --- |
| Application | DrawScope 0.6.5 |
| Engine contract | 1.0 |
| Methodology | 1.3.0 |
| Game era | Powerball 2015-current |
| Archive | 41,598 drawings across six archived games |
| Database SHA-256 | `89a9370d4dcbba7a6ca22e218e4ed6ba6ff1a960b5c1247f3f3f4a0a4569662f` |
| Fixed seed | `20260728` |
| Maximum walk-forward trials | 250 |
| Signals | 30 fixed, correlated historical signals |

[`analysis-evidence.json`](analysis-evidence.json) contains the complete structured result and its execution metadata. The target draw is excluded from every score used to rank it. Strategy selection is performed on the discovery segment, then measured on the later untouched confirmation segment.

## Reproduce the packaged boundary

From an extracted DrawScope portable release:

```powershell
./DrawScope.exe --analysis-evidence > analysis-evidence.json
python tools/verify_analysis_evidence.py analysis-evidence.json --compare examples/powerball-retrospective-v0.6.5/analysis-evidence.json
```

When running only from source, first build the verified portable package with `BUILD-LATEST.ps1`; the build invokes the same CLI and compares its result with the committed evidence.

## Interpretation

The evidence file must be read with the following boundaries:

- The bounded confidence rating describes historical ranking stability, not a probability of winning.
- A p-value does not measure the probability that a future ticket will win.
- Thirty correlated exploratory signals create multiplicity concerns that one chronological split cannot eliminate.
- Independent lottery drawings retain their published theoretical odds.
- The only permitted recommendations are `do_not_use_to_choose_numbers` and `historical_experiment_only`.

See the [methodology](../../docs/METHODOLOGY.md), [responsible-use policy](../../docs/RESPONSIBLE-USE.md), and [known limitations](../../docs/KNOWN-LIMITATIONS.md) before interpreting the result.
