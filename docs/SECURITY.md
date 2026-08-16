# Security model

## Trust boundaries

- React has no shell, generic filesystem, direct database, direct Python, or unrestricted network permission.
- Tauri exposes narrow commands for a safe aggregate snapshot, bounded/paged drawing
  queries, era-scoped analysis, source status, and permission-gated saved-page import.
- Rust builds a fixed engine request, launches only `drawscope-engine.exe`, clears inherited environment variables, supplies a portable temporary directory, bounds protocol lines and error capture, checks sequence order, and applies a timeout.
- Release paths derive from the executable location. Runtime code contains no dependency on the supplied machine-specific source paths.
- SQLite uses one Rust-owned connection path, transactional migrations, a verified
  bundled seed, and bounded query pages.

## Input and archive controls

Source data is hostile until schema, size, date, era, number range, cardinality, uniqueness/order, and provenance checks pass. Future adapters permit approved HTTPS hosts only and must revalidate redirects. ZIP import/export rejects absolute, parent, drive-prefix, symlink/reparse, excessive-count, and excessive-size entries.

## Diagnostics and privacy

User-visible errors contain stable codes and diagnostic IDs rather than raw paths or standard error. Logs and support bundles redact query strings, credentials, headers, cookies, and user paths. DrawScope collects no account or ticket-purchase credentials.

## Distribution integrity

Future tagged releases fail closed unless a trusted Authenticode certificate is supplied
through encrypted repository secrets. The ephemeral release runner imports only the PFX
needed for that run, validates its expiry and code-signing purpose, signs the analytics
sidecar and desktop executable, requires the NSIS installer signature, and removes the
certificate in an unconditional cleanup step. Private keys, PFX files, passwords, and
real thumbprints do not belong in source, logs, build metadata, or support bundles.

Checksums detect accidental or malicious artifact changes after publication; SPDX SBOMs
describe the dependency inventory; GitHub attestations bind selected distributables to
the release workflow. None substitutes for validating the signer, tag, repository, and
artifact together. See [`DISTRIBUTION.md`](DISTRIBUTION.md).
