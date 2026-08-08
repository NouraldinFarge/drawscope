# Roadmap

DrawScope is active portfolio software. Priorities are ordered by reliability and evidence, not by the number of visible features.

## Current baseline · 0.6.5

- Reproducible 41,598-draw offline archive with hash-checked source artifacts.
- Leakage-resistant 30-signal walk-forward evaluation with an untouched confirmation period.
- Strict React, Rust, Python, and JSON-contract boundaries.
- Portable Windows release with checksum, SPDX SBOM, and provenance attestation.
- Explicit source-policy, responsible-use, security, accessibility, and known-limit documentation.

## Near term

- Keep source manifests and the bundled archive reproducible.
- Expand import fixtures and cross-language contract coverage.
- Add a clean-machine Windows/WebView2 release smoke test.
- Add Authenticode signing when a suitable trusted certificate is available.
- Preserve concise, evidence-linked release notes for every public tag.

## Later

- Add more lawful, well-documented source adapters.
- Improve large-archive performance without weakening auditability.
- Evaluate additional retrospective signals only with a preregistered train/test boundary.

## Decision principles

- Prefer a smaller claim with evidence over a larger claim with caveats.
- Treat data lineage, upgrade safety, and rollback behavior as product features.
- Add a signal only when its temporal boundary and counterfactual test are explicit.
- Keep the portable workflow usable without an account, telemetry, or a cloud dependency.

## Non-goals

- Predicting winning numbers or presenting research confidence as probability.
- Automating access that conflicts with a source's terms or controls.
- Cloud accounts, remote telemetry, or hidden collection of user data.
