# DrawScope 0.4.0 end-to-end audit

Audit date: 2026-07-28

## Outcome

The repository, offline archive pipeline, native command layer, analytics engine,
desktop interface, documentation, and portable release path were reviewed together.
The audit found and corrected correctness, truthfulness, accessibility, security,
resilience, performance, and repository-hygiene problems. The six-game archive remains
41,598 drawings; no records were discarded by the migration.

## Correctness and data integrity

- Fixed current-gap analytics so dates, not incoming row order, determine recency.
- Made failed engine events strictly monotonic (`analysis_started` sequence 1,
  `job_failed` sequence 2).
- Removed an undeclared native `date_range` field that caused the packaged engine to
  reject otherwise valid full-archive analysis requests.
- Corrected Powerball jackpot odds to include both the five main-ball combination and
  the 1–26 special-ball pool.
- Replaced the eight-row Ticket Lab approximation with a native full-current-era
  Powerball comparison.
- Added strict ticket, drawing-query, year, session, offset, and game-specific number
  validation.
- Stopped Explorer from briefly displaying records from the previously selected
  game/filter.
- Corrected evidence labels so secondary data is not described as cross-checked.
- Canonicalized saved-import era IDs with the bundled archive.
- Made oversized saved pages visible as rejected failures instead of silently skipping
  them.
- Preserved user-imported draws when a newer bundled seed contains the same game,
  date, and session.
- Added startup `PRAGMA quick_check`, manifest/database hash agreement, real rule-era
  counts, and archive provenance in the snapshot.
- Added schema version 4 query/job indexes.

The rebuilt seed passed `quick_check`, all four migrations, foreign-key/orphan checks,
duplicate-key checks, source/hash validation, and exact coverage validation:

| Game | Draws | Coverage |
|---|---:|---|
| Powerball | 3,813 | 1992-04-22 through 2026-07-27 |
| Mega Millions | 2,522 | 2002-05-17 through 2026-07-24 |
| Illinois Lotto | 1,960 | 2014-01-20 through 2026-07-27 |
| Lucky Day Lotto | 9,147 | 2014-01-19 through 2026-07-28 |
| Pick 3 | 12,078 | 2010-01-01 through 2026-07-28 |
| Pick 4 | 12,078 | 2010-01-01 through 2026-07-28 |

## Security and resilience

- Removed inline styling/scripts and tightened CSP by removing `unsafe-inline`; added
  `object-src 'none'`, `base-uri 'none'`, and `form-action 'self'`.
- Restricted builder downloads to HTTPS and explicit approved hosts, validated final
  redirect destinations, and capped responses at 64 MiB.
- Made cached source writes, the database build, and manifest replacement atomic.
- Build failures no longer destroy the last valid database.
- Unexpected engine exceptions now produce redacted terminal errors instead of raw
  internals.
- Existing path traversal, fixed executable, cleared-environment, bounded protocol,
  timeout, and transactional import controls were retained and revalidated.
- No secrets, credentials, tokens, telemetry, authentication system, remote API, or
  server-side request surface exists in the repository.

## UX, accessibility, and truthfulness

- Added complete loading, empty, error, retry, disabled, and live-result states to all
  data-driven screens.
- Rebuilt mobile navigation with a visible close action, backdrop, Escape support,
  initial focus, Tab containment, focus restoration, hidden-offscreen controls, and
  scroll locking.
- Restored focus and scroll position after route changes.
- Added semantic filter grouping, captions, native progress elements, field-level
  errors, `aria-invalid`, `aria-busy`, and live status announcements.
- Made Explorer pagination and game-aware filter limits explicit.
- Made source evidence labels, archive gaps, actual rule-era count, and diagnostics
  data truthful and dynamic.
- Marked walk-forward testing as planned rather than available.
- Reduced the minimum window width to 360 pixels and improved narrow-layout wrapping.
- Improved disabled, focus, error, and dark-theme contrast.

## Code and repository cleanup

- Centralized safe theme initialization and removed duplicated inline theme logic.
- Extracted ticket validation and the pure native ticket profiler for direct tests.
- Removed the unused default-config file and unused fixture environment switch.
- Aligned all workspace, UI, native, and engine versions at 0.4.0.
- Updated React type definitions and the compatible Rust `toml` build dependency;
  retained Python major-version caps where the next releases are intentionally
  incompatible with the current support matrix.
- Added `.gitignore` coverage for JS, Rust, Python, development database, logs,
  runtime, temporary, output, and user-owned configuration artifacts.
- Added a guarded `pnpm clean:generated` command for reproducible caches, compiled
  frontend/engine output, and portable staging files.
- Removed generated text output found inside source areas. Binary caches and build
  products are ignored and excluded from source packaging.
- Updated architecture, database, testing, source-research, and limitation documents
  where the implementation had moved beyond or differed from the text.
- Added the complete named-function inventory.

## Performance

- Added a compound drawing date/session query index and job-state update index.
- Removed stale-query placeholder rendering.
- Kept archive reads bounded to 200 rows, with the UI using 50-row pages.
- Kept analytical work outside the UI process and limited Powerball analysis to its
  applicable rule era.
- Avoided new dependencies; the locked dependency set remains minimal for the current
  architecture.
- The production JavaScript audit reported no known vulnerabilities, and the
  direct Python runtime dependency was current within its compatibility range.

## Verification gates

- Biome format and lint
- TypeScript project build
- Vitest: 5 tests
- Rust format and tests: 12 tests
- Ruff format and lint
- strict mypy
- pytest: 8 tests
- SQLite archive rebuild and integrity/coverage checks
- production Vite build
- portable build health, move/rename, archive-shape, and rollback checks
- manual browser interaction at desktop and narrow widths, including navigation,
  keyboard behavior, validation, theme, and console review

## Deliberate remaining limits

- Earlier Illinois Lotto/Lucky Day rows not available from a suitably licensed bulk
  source are not inferred or copied.
- The historical Iowa evidence does not contain Illinois Fireball for
  2013-09-01–2014-01-18.
- Automated Lottery.net extraction remains disabled under its published terms; lawful
  saved pages can be imported.
- The app is local/offline and has no background updater. New approved source evidence
  must be rebuilt into a release.
- Advanced predictive-sounding features remain deliberately unimplemented; historical
  analysis does not improve lottery odds.
- The local executable is not code-signed. SBOM, dedicated axe automation, Storybook,
  and clean-machine WebView2 validation remain production release gates.
