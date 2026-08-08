# DrawScope 0.6.5 engineering and research-integrity audit

Audit date: 2026-08-08  
Application: 0.6.5  
Methodology: 1.3.0  
Contract: 1.0  
Database schema: 4

## Implemented improvements

- Removed lower-number preference at tied selection cutoffs. Equal scores now receive
  equal competition ranks and midrank percentiles; cutoff selection uses a declared,
  outcome-independent SHA-256 order.
- Isolated discovery selection in a dedicated function and proved that changing final
  confirmation outcomes cannot change the frozen pattern key.
- Rejected duplicate dates, unexpected special balls, additional JSON properties,
  sidecar methodology/sample/signal/backtest drift, and confidence values over 49.
- Added strict nested Zod validation at the native-to-React analytics boundary.
- Added distinct offline database/manifest output paths and a byte-for-byte second
  frozen reconstruction to the release pipeline.
- Fixed responsive-drawer focus entry and added focus/Escape/inertness regression
  coverage.
- Patched the `fast-uri` and `nanoid` development dependency advisories and integrated
  the reviewed React type and Vite patch updates.
- Reconciled the methodology, limitations, source research, contracts, testing,
  function inventory, issue template, README, citation, and changelog.

## Verification evidence

| Gate | Result |
|---|---|
| TypeScript/Biome/Vitest | 5 files, 9 tests passed; formatting, lint, and project references passed |
| Python | Ruff format/lint passed; strict mypy passed; 18 pytest tests passed |
| Rust | format, locked check, Clippy with warnings denied, and 14 tests passed |
| JavaScript advisories | no known vulnerabilities |
| Python advisories | no known third-party vulnerabilities; local package correctly skipped |
| Rust advisories | no known vulnerabilities; 17 documented maintenance/unsoundness warnings in inactive Linux GTK lock entries |

Two isolated frozen reconstructions produced identical database and manifest bytes.
The database is 41,394,176 bytes with SHA-256
`89a9370d4dcbba7a6ca22e218e4ed6ba6ff1a960b5c1247f3f3f4a0a4569662f`.
The rebuilt manifest SHA-256 is
`37d02ba878536f85a98d4d012bc89f7ee5a858bf36f3af27ad5300e6f2a2be80`.
Every recorded source path, byte count, SHA-256, and retrieval timestamp was present
and matched. SQLite `integrity_check` returned `ok`, `foreign_key_check` returned no
rows, and the archive contained exactly 41,598 drawings across six games.

The portable ZIP is 22,193,950 bytes with SHA-256
`be55788af17910ee73821bc33095037ba2bad0d1396e1a836518465dc1499642`.
No installer-shaped artifact was produced. Health checks passed in the staged archive,
a path containing spaces, a renamed folder, a relocated folder, the upgrade candidate,
and the promoted active build.

The full packaged analysis used 1,365 current-era Powerball drawings, rebuilt 30 signals
across 250 walk-forward trials, returned exact jackpot odds of 1 in 292,201,338, and
reported a best-pattern confidence of 5/100. The confidence remained inside the 0–49
retrospective cap and is explicitly described as historical evidence, not winning
probability. Two complete native-to-sidecar runs took 8.14 and 8.17 seconds, below the
30-second process bound. Database/app health took 210 and 195 milliseconds.

Eight durable analysis-job rows dated before this release remained after bundled-seed
promotion, while the seed hash advanced through the transactional merge. No prior
`config/user.json` or saved-page import existed in the active build; their preservation
paths remain covered by the guarded release workflow.

## Remaining manual qualifications

- The Windows executable is not code-signed.
- A genuinely clean Windows x64 machine with an independently provisioned WebView2
  runtime has not been qualified.
- Dedicated axe automation and Storybook remain absent; semantic tests and manual
  full-size/narrow-size, dark/light, focus, overflow, and keyboard checks provide
  partial accessibility evidence.
- Prospective, preregistered future-draw validation does not exist. The historical
  confidence score therefore cannot reach 50 and must not be used to choose numbers.
