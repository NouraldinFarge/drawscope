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

## Archive freshness alert

Read the generated report and classify each stale game as approved open-data refresh,
controlled official-page acquisition, or permission-gated saved-page import. Confirm the
publisher policy before network access. Refresh raw evidence, parser fixtures, manifest,
and seed together; run two frozen byte-identical rebuilds; then regenerate the README,
site, screenshots if affected, and packaged evidence. Update the single managed issue—do
not close it until the committed manifest proves the new dated coverage.

## Statistical defect

Capture dataset, coverage, era, sample size, method version, seed, and expected independent result. Reduce to a deterministic fixture, repair the pure function, compare with an independent calculation, then add regression coverage and update methodology.

## Portable release or active deployment

Do not touch the previous active build until the ZIP and temporary extraction pass health, path-with-spaces, rename, move, and installer-denial checks. On replacement failure, remove only the validated candidate path and restore `.active-build-backup`. Keep the failed evidence under guarded temporary output for diagnosis.

## Installer or signing failure

Do not upload an unsigned substitute. Verify the certificate is present in the ephemeral
current-user store, unexpired, code-signing-capable, and identified by the expected
40-character thumbprint. Confirm `signtool.exe`, the RFC 3161 timestamp endpoint, and the
Tauri NSIS prerequisites. Re-run the guarded local installer test and inspect signatures
on `DrawScope.exe`, `drawscope-engine.exe`, and setup. Preserve the previous public
release until every gate passes. See [`DISTRIBUTION.md`](DISTRIBUTION.md).

## Project-site deployment failure

Build `site/dist` locally and require version-bound evidence with no unresolved template
tokens. Verify local assets and `archive-status.json` against the manifest. Confirm the
repository's Pages source is GitHub Actions and that the workflow has `pages: write` and
`id-token: write`. Re-run only after the build artifact is valid; do not hand-edit the
deployed Pages output.
