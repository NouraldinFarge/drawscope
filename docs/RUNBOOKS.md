# DrawScope troubleshooting and repair runbooks

## Frontend rendering or stale state

Record app version, route, window size, scaling, theme, motion preference, fixture, and steps. Check the typed query and owning route before CSS. Repair the owning feature or primitive; verify loading, empty, error, long-content, keyboard, narrow, dark, and reduced-motion states; add a component or journey regression.

## Layout overflow

Inspect the parent grid/flex constraint, min-content size, and scroll owner. Use `min-inline-size: 0`, `minmax(0, 1fr)`, safe wrapping, or intentional local table scroll. Never clip content merely to hide the defect.

## Sidecar launch or malformed JSONL

Preserve job identity and diagnostics. Verify the fixed executable, hash/version, portable working root, sanitized environment, contract major version, line size, and monotonic sequence. Standard output must contain JSONL only. Do not grant arbitrary execution or parse human logs.

## Cancellation or recovery

Stop new work for the attempt, persist cancellation requested, signal cooperatively, wait a bounded period, terminate only as fallback, reconcile the checkpoint and child outcome, then mark terminal. Ambiguous work becomes `needs_attention`, never guessed success.

## SQLite lock, WAL growth, or migration failure

Preserve the database, WAL, and shared-memory files. Identify long readers and transaction owners, verify local storage, busy policy, disk space, and SQLite version. Do not delete a live WAL file. Restore a verified backup or rebuild the index from canonical job folders.

## Source/parser failure

Fail closed and retain the redacted raw-response hash. Verify host/redirect/content limits, parser version, and source shape. Update a versioned adapter only with a fixed fixture and regression test. Do not infer missing numbers.

## Statistical defect

Capture dataset, coverage, era, sample size, method version, seed, and expected independent result. Reduce to a deterministic fixture, repair the pure function, compare with an independent calculation, then add regression coverage and update methodology.

## Portable release or active deployment

Do not touch the previous active build until the ZIP and temporary extraction pass health, path-with-spaces, rename, move, and installer-denial checks. On replacement failure, remove only the validated candidate path and restore `.active-build-backup`. Keep the failed evidence under guarded temporary output for diagnosis.
