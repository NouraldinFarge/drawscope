# Changelog

All notable public changes to DrawScope are documented here.

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
[0.6.0]: https://github.com/NouraldinFarge/drawscope/releases/tag/v0.6.0
