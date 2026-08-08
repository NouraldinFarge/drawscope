# Changelog

All notable public changes to DrawScope are documented here.

## [0.6.5] - 2026-08-08

- Remove lower-number bias from tied pattern scores with neutral competition ranks and
  an outcome-independent SHA-256 cutoff order (methodology 1.3.0).
- Make discovery-only strategy selection explicit and regression-test that changed
  confirmation outcomes cannot change the selected pattern.
- Reject duplicate draw dates, unexpected special balls, unknown contract properties,
  methodology drift, invalid sidecar result bounds, and confidence values above 49.
- Parse native analytics results through nested strict Zod schemas before UI use.
- Add distinct database/manifest output paths and require two byte-identical frozen
  rebuilds in the portable release pipeline.
- Resolve high-severity development dependency advisories in `fast-uri` and `nanoid`,
  and apply the reviewed Vite/React type patch updates from Dependabot PR #9.
- Correct stale limitations, methodology, source, function-inventory, test, issue, and
  AI-assistance documentation.

## [0.6.4] - 2026-08-01

- Publish the verified release assets from the workflow's explicit GitHub repository context.
- Raise the pytest development dependency to 9.0.3 or later to address vulnerable temporary-directory handling on Unix systems.
- Rebuild the offline SQLite archive deterministically from committed, hash-checked source artifacts on clean release runners.
- Publish the verified maintenance build as an immutable release.
- Include the portable Windows ZIP, SHA-256 checksum, SPDX SBOM, and provenance attestation.

## [0.6.0] - 2026-08-01

### Added

- Public portfolio source with React, Rust/Tauri, Python, SQLite, and versioned contracts.
- Reproducible offline archive and source-provenance manifests.
- Leakage-resistant walk-forward evaluation with an untouched held-out segment.
- Validation-first Illinois archive import workflow.
- Verified portable Windows build pipeline.
- GitHub CI, CodeQL, dependency updates, security reporting, and contribution guidance.

[0.6.4]: https://github.com/NouraldinFarge/drawscope/releases/tag/v0.6.4
[0.6.5]: https://github.com/NouraldinFarge/drawscope/releases/tag/v0.6.5
[0.6.0]: https://github.com/NouraldinFarge/drawscope/releases/tag/v0.6.0
