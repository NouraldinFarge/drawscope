# DrawScope function inventory — 0.6.0

This inventory covers every named production function, component, hook, command,
entrypoint, and build helper in the repository. Inline event handlers and small array
callbacks are intentionally recorded under their owning function instead of being
listed as separate anonymous functions. Tests are summarized at the end.

## User-facing application functions

| Area | Function | What it does |
|---|---|---|
| Overview | `OverviewPage` | Shows archive size, game count, rule-era count, verification coverage, recent Powerball results, and recovery states. |
| Overview | `Coverage` | Renders a native progress indicator and accessible coverage label. |
| Overview | `Loading` | Presents the overview loading state. |
| Overview | `ErrorState` | Presents a recoverable overview error and retry action. |
| Games | `GamesPage` | Lists every configured lottery, its rules, schedule, odds, era, price, and official source. |
| Explorer | `ExplorerPage` | Runs validated, paged, game/session/year/number queries against the offline archive. |
| Explorer | `keyedNumbers` | Gives repeated ordered digits stable render keys. |
| Explorer | `verificationPresentation` | Maps source status to honest evidence labels and visual tones. |
| Analytics | `AnalyticsPage` | Selects a historical Powerball winner, runs leakage-free 30-signal scoring and walk-forward testing, and presents the frozen best pattern, discovery/confirmation evidence, capped confidence rating, ticket shape, signals, and archive results. |
| Analytics | `percent` | Formats a percentage at a readable precision. |
| Analytics | `pValue` | Formats small and ordinary p-values without implying false precision. |
| Analytics | `evidenceLabel` | Converts the bounded backtest evidence grade into a non-predictive label. |
| Analytics | `confidenceLabel` | Converts the best-pattern confidence band into a plain-language evidence label. |
| Analytics | `recommendation` | Converts the validation outcome into a responsible-use recommendation. |
| Ticket Lab | `TicketPage` | Validates a ticket and compares it with every drawing in the current Powerball era. |
| Ticket Lab | `submit` | Handles the page form, validation, async comparison, and recoverable errors. |
| Ticket Lab | `validatePowerballTicket` | Rejects missing, fractional, duplicate, or out-of-range ticket numbers. |
| Data updates | `DataUpdatesPage` | Shows source policy/feed status and imports permissioned saved annual pages. |
| Data updates | `Result` | Renders one import-result metric. |
| Data updates | `friendlyCode` | Converts stable import error codes into readable messages. |
| Data quality | `DataQualityPage` | Shows archive dates, hashes, source counts, known gaps, and verification levels. |
| Data quality | `Source` | Renders a provenance field. |
| Methodology | `MethodologyPage` | Separates available analytical methods from planned methods and explains limitations. |
| Diagnostics | `DiagnosticsPage` | Loads the real local health snapshot with pending/error/retry behavior. |
| Diagnostics | `DiagnosticResults` | Renders runtime, database, schema, archive, engine, and privacy status. |

## Application shell and shared UI

| Function | What it does |
|---|---|
| `AppShell` | Owns navigation, route focus restoration, mobile drawer focus trapping, Escape handling, scroll locking, theme control, and the main landmark. |
| `closeNavigation` | Closes the mobile drawer after any dismiss action and restores focus after the inert background is released. |
| `closeOnEscape` | Closes the mobile drawer and returns focus to its toggle. |
| `Brand` | Renders the full or compact DrawScope identity. |
| `ThemeButton` | Switches and announces the light/dark theme. |
| `Page` | Supplies consistent page title, description, eyebrow, and content structure. |
| `Stat` | Renders a labeled metric. |
| `Ball` | Renders a main or special lottery ball. |
| `Badge` | Renders text-plus-color status. |
| `getInitialTheme` | Safely resolves stored or operating-system theme preference. |
| `applyTheme` | Applies a theme to the document and updates the browser color scheme. |

The router creates nine lazy-preloadable application routes and the startup module
creates the React Query client, applies the initial theme, validates the root element,
and mounts React in strict mode.

## Typed UI data functions

| Function | What it does |
|---|---|
| `isTauri` | Detects whether the interface is running in the native shell. |
| `getSnapshot` | Retrieves the validated application/archive summary or a browser fixture. |
| `getDrawings` | Retrieves a bounded page of normalized drawings. |
| `runAnalysis` | Requests full current-era Powerball analytics for the latest or a selected historical target date. |
| `analyzePowerballTicket` | Requests a full-archive ticket comparison. |
| `getSourceUpdateSnapshot` | Retrieves saved-page adapter and feed status. |
| `importSavedLotteryNetPages` | Starts a policy-gated import of locally saved pages. |
| `analyzeLocally` | Supplies deterministic, non-predictive browser-preview analytics. |
| `useSnapshot` | Caches the application snapshot. |
| `useDrawings` | Caches a drawing query and prevents invalid queries from running. |
| `useSourceUpdates` | Caches source-update status. |
| `useSavedPageImport` | Runs an import and invalidates every affected cache. |

The contracts package also exports the Zod validators
`verificationSchema`, `gameDefinitionSchema`, `drawingSchema`,
`numberStatisticSchema`, `pairStatisticSchema`, `winningNumberPatternSchema`,
`signalContributionSchema`, `signalPerformanceSchema`,
`retrospectivePatternAnalysisSchema`, and `analysisResultSchema`.

## Native Rust functions

### Entrypoints and error constructors

| Function | What it does |
|---|---|
| `main` (`src/main.rs`) | Enters the desktop app or the command-line health check. |
| `run` | Initializes tracing, storage, application state, and the narrow Tauri command allowlist. |
| `health_check_cli` | Opens the portable database and emits machine-readable runtime health. |
| `analysis_health_check_cli` | Runs the full native→packaged-engine→full-archive path and verifies sample size, Powerball jackpot odds, 30 pattern signals, a 250-draw backtest, and the confidence cap. |
| `AppError::storage` | Creates a redacted storage error with a diagnostic ID. |
| `AppError::engine` | Creates a redacted engine error with retry guidance. |
| `AppError::contract` | Creates a redacted invalid-contract error. |
| `AppError::source` | Creates a redacted source/import error with retry guidance. |

### Tauri commands and archive queries

| Function | What it does |
|---|---|
| `get_app_snapshot` | Aggregates games, coverage, recent draws, database state, real rule-era count, and verified archive metadata. |
| `read_archive_status` | Parses the bundled manifest and proves its seed hash matches the imported database. |
| `get_drawings` | Locks the database and delegates a drawing query. |
| `query_drawings` | Validates, filters, counts, orders, and pages drawing records with their source metadata. |
| `drawing_query_is_valid` | Enforces limits, offsets, sessions, years, known games, and game-specific number ranges. |
| `special_name` | Maps a game to the correct special-ball label. |
| `get_source_update_snapshot` | Returns current source adapter/feed/import state. |
| `import_saved_lottery_net_pages` | Resolves the fixed inbox and transactionally imports eligible saved pages. |
| `analyze_powerball_ticket` | Loads the full current era and delegates ticket profiling. |
| `profile_powerball_ticket` | Validates a ticket and computes sample range, matches, sum, and odd count. |
| `analyze_powerball_archive` | Creates a durable job, sends the full current era and optional historical target date to the engine, and records its terminal state. |
| `build_powerball_analysis_request` | Builds the exact strict engine command, including current special-ball rules, target date, and bounded backtest size. |
| `load_powerball_analysis_draws` | Loads all current-era Powerball rows and their ordered main numbers. |

### Engine, paths, and storage

| Function | What it does |
|---|---|
| `run_known_engine` | Launches only the fixed sidecar with a cleared environment, concurrent bounded pipe draining, timeout, and protocol checks. |
| `read_engine_stream` | Drains an engine output pipe without deadlock while retaining only the permitted byte limit and accepting a normal broken-pipe EOF. |
| `terminal_engine_failure_code` | Maps a redacted engine terminal event to a specific stable native error code. |
| `resolve_engine_path` | Resolves and validates the fixed development or portable engine executable. |
| `resolve_portable_root` | Resolves the app root from the executable in release builds. |
| `safe_child` | Rejects absolute, parent, root, and platform-prefix path components. |
| `initialize_storage` | Creates controlled folders, applies four migrations, verifies SQLite, seeds catalog data, and merges the archive. |
| `seed_catalog` (`lib.rs`) | Parses and upserts the canonical game catalog. |
| `merge_offline_archive` | Hash-verifies and transactionally merges a changed seed while preserving user-imported draws. |

### Saved-page source adapter

| Function | What it does |
|---|---|
| `seed_catalog` (`source_import.rs`) | Seeds provider policy, annual feed definitions, and known game eras. |
| `source_snapshot` | Aggregates provider/feed/import totals for the UI. |
| `import_saved_pages` | Preflights file names and sizes, then imports each page with failure accounting. |
| `import_one_page` | Hashes, parses, validates, deduplicates, and commits one page as a transaction. |
| `parse_archive_html` | Extracts archive rows and optional draw metadata from saved HTML. |
| `validate_numbers` | Applies game-specific cardinality, range, uniqueness/order, and optional-ball rules. |
| `identify_saved_page` | Matches only catalog-approved file patterns. |
| `seed_known_eras` | Upserts the canonical Illinois era definitions used by imports. |
| `era_for` | Selects the canonical era from feed and drawing date. |
| `parse_draw_date` | Parses the archive’s displayed date into an ISO date. |
| `text_content` | Normalizes visible element text. |
| `selector` | Creates trusted compile-time CSS selectors. |
| `read_catalog` | Deserializes the bundled source-policy catalog. |

The Tauri build script has one `main` function that applies the native build
configuration.

## Python analytics engine functions

| Function | What it does |
|---|---|
| `_emit` | Serializes one validated, monotonic JSONL engine event. |
| `_fail` | Emits a redacted terminal failure with the supplied sequence number. |
| `process_line` | Validates one command, handles health/analysis, and converts expected or unexpected failures safely. |
| `main` | Reads bounded stdin lines and returns the correct process status. |
| `_validate_payload` | Sorts draws by date and enforces main/special count, range, cardinality, and unordered uniqueness. |
| `_season` | Maps a date to a meteorological season. |
| `_month_phase` | Maps a date to the early, middle, or late part of its month. |
| `_week_of_month` | Maps a date to its numbered week within a month. |
| `_main_numbers` | Retrieves one drawing's main-number population. |
| `_special_numbers` | Retrieves a zero-or-one special-number population. |
| `_frequency_vector` | Counts each eligible number over an arbitrary historical slice. |
| `_rate_difference_vector` | Compares recent and preceding appearance rates for momentum scoring. |
| `_decayed_frequency_vector` | Applies a fixed exponential half-life to historical appearances. |
| `_gap_vector` | Calculates the pre-draw gap signal for the complete number pool. |
| `_relative_gap_vector` | Normalizes current gaps against each number's earlier mean gap. |
| `_last_seen_gap` | Finds one number's most recent pre-draw appearance. |
| `_sum_band` | Classifies a previous ticket's total into low, middle, or high history-relative bands. |
| `_transition_vector` | Measures which numbers historically followed numbers in the immediately preceding draw. |
| `_signal_vectors` | Builds all 30 fixed recency, decay, momentum, calendar, year, gap, transition, and previous-draw vectors. |
| `_standardize` | Converts a signal vector to population z-scores without divide-by-zero artifacts. |
| `_percentiles` | Produces tie-neutral midrank percentiles across a pool. |
| `_top_numbers` | Chooses a deterministic top-ranked set with number-order tie breaking. |
| `_score_pool` | Applies the fixed weights, ranks the pool, and packages raw/composite scores. |
| `_winning_number_pattern` | Builds the pre-draw evidence record and five strongest supporting signals for one winning number. |
| `_empirical_percentile` | Places a ticket statistic in its earlier observed distribution. |
| `_has_consecutive` | Detects adjacent values in an unordered main-number set. |
| `_max_consecutive_run` | Measures the longest adjacent-number run in a ticket. |
| `_is_prime` | Identifies prime ticket values. |
| `_repeated_last_digit_pairs` | Counts pairs that share a final decimal digit. |
| `_population_standard_deviation` | Measures ticket-number dispersion. |
| `_matching_rate` | Measures how often an exact ticket-shape count appeared historically. |
| `_ticket_pattern` | Describes pairs, triples, sum, spread, dispersion, parity, low/high balance, primes, multiples of three, endings, adjacency, repeats, and their historical context. |
| `_mean` | Computes the mean of a non-empty analytical vector. |
| `_expected_top_hits` | Computes the hypergeometric chance expectation for a ranked pick set. |
| `_top_hit_variance` | Computes the matching hypergeometric variance. |
| `_lift` | Expresses observed mean hits as a ratio to chance expectation. |
| `_z_score` | Standardizes observed hits against the chance variance. |
| `_confirmation_blocks` | Measures how many chronological confirmation blocks beat chance. |
| `_confidence_rating` | Converts untouched confirmation lift, one-sided significance, and stability into a 0–49 evidence score and recommendation. |
| `_strategy_values` | Retrieves the ranked value vector for one fixed signal or the composite strategy. |
| `_best_pattern_validation` | Chooses a pattern only on the first 60% of backtests, freezes it, validates it on the final 40%, and builds its counterfactual target ticket. |
| `_walk_forward_backtest` | Rebuilds all 30 signals and the fixed composite before up to 250 targets and compares top-five hits with a hypergeometric chance baseline. |
| `_retrospective_analysis` | Enforces target chronology and assembles number, ticket, signal, backtest, discovery/confirmation, and confidence results. |
| `analyze` | Computes full-archive descriptors, deterministic simulation, jackpot odds, and the retrospective pattern test. |

`AnalysisInputError` represents safe analytical input failures. `SignalDefinition`,
`ScoreBundle`, `StrategySeries`, and `SignalValidation` hold immutable scoring
configuration and intermediate results. Pydantic models define strict commands,
drawings, events, statistics, date ranges, patterns, signal contributions,
discovery/confirmation validation, confidence ratings, backtests, simulations, and
results; they reject unknown fields.

## Offline database builder functions

| Function | What it does |
|---|---|
| `HiddenInputParser.__init__` | Initializes the Iowa form-token parser. |
| `HiddenInputParser.handle_starttag` | Collects hidden form fields from trusted downloaded markup. |
| `utc_now` | Produces a normalized UTC timestamp. |
| `sha256_bytes` | Hashes an in-memory source artifact. |
| `atomic_write` | Writes a sibling temporary file and atomically replaces the destination. |
| `read_limited` | Streams a response with a hard 64 MiB limit. |
| `validate_download_url` | Allows HTTPS and the explicit approved-host list only. |
| `download` | Reuses cached evidence or performs a redirect-validated, size-bounded download. |
| `parse_iso_date` | Normalizes an ISO date. |
| `parse_us_date` | Normalizes a US-formatted date. |
| `powerball_era` | Assigns the historical Powerball rule era. |
| `mega_millions_era` | Assigns the historical Mega Millions rule era. |
| `parse_powerball_archive` | Reads the licensed Powerball ZIP/CSV into normalized draws. |
| `parse_mega_millions` | Reads official New York Mega Millions data. |
| `parse_ny_powerball` | Builds the official Powerball cross-check map. |
| `load_illinois` | Loads the hashed official Illinois artifact and its provenance. |
| `hidden_fields` | Extracts Iowa request tokens. |
| `parse_iowa_rows` | Parses shared Illinois Pick 3/Pick 4 results. |
| `fetch_iowa_endpoint` | Performs the bounded official Iowa page workflow. |
| `load_or_fetch_iowa` | Reuses or refreshes the Iowa evidence artifact. |
| `validate_draws` | Enforces dates, sessions, URLs, ranges, counts, and unordered uniqueness for all draws. |
| `insert_game_eras` | Inserts canonical historical rules into the seed. |
| `create_database` | Builds and verifies the complete indexed SQLite seed in a temporary file before replacement. |
| `main` | Coordinates source acquisition, parsing, cross-checking, validation, database creation, and manifest output. |

`Draw` is the immutable normalized builder record.

## Release build functions

| Function | What it does |
|---|---|
| `Write-Step` | Prints one readable build phase. |
| `Assert-DirectChild` | Prevents release cleanup from escaping its expected parent. |
| `Invoke-Checked` | Runs a build command and stops on failure. |
| `Test-Health` | Executes and validates both packaged database/app health and the strict JSONL analytics-engine health contract. |
| `Get-Sha256` | Calculates release-file identities. |
| `Remove-GeneratedTarget` | Validates a known generated path stays inside the workspace, then removes that reproducible artifact. |

The remainder of `BUILD-LATEST.ps1` is a fail-fast orchestration pipeline: restore
locked dependencies, run all quality gates, build the database/engine/app, stage only
the portable layout, test it from moved paths, produce and inspect the ZIP, preserve
user data, and transactionally promote the release.

## Regression and verification functions

The repository contains 7 TypeScript tests, 14 Python tests, and 13 Rust tests. They
cover contracts, UI responsible-use copy, ticket validation, analytics correctness,
input-order-independent gaps, special-ball jackpot odds, target-date leakage,
calendar/ticket patterns, 30 fixed signals, discovery-only pattern selection,
untouched confirmation, confidence thresholds and the 49-point cap, walk-forward
bounds, protocol health/failure sequencing, strict cross-layer request shape,
redacted failure-code mapping, source parsing and idempotency, path safety, query
validation, archive fixtures, and ticket profiling.
The release script adds database integrity, source-hash, portable-layout, move/rename,
rollback, and health-launch checks.
