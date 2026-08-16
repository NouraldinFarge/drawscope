# Roadmap

DrawScope is active portfolio software. Priorities are ordered by reliability and evidence, not by the number of visible features.

## Current baseline · 0.6.5

- Reproducible 41,598-draw offline archive with hash-checked source artifacts.
- Leakage-resistant 30-signal walk-forward evaluation with an untouched confirmation period.
- Strict React, Rust, Python, and JSON-contract boundaries.
- Portable Windows release with checksum, SPDX SBOM, and provenance attestation.
- Explicit source-policy, responsible-use, security, accessibility, and known-limit documentation.
- Manifest-driven GitHub presentation, a project-specific site, and version-bound packaged analysis evidence.
- Weekly archive-freshness reporting with one managed data-quality issue.
- A tested NSIS installer path whose public release is blocked until trusted Authenticode signing is configured.

## Near term

- Refresh the dated archive through approved sources and keep its manifest reproducible.
- Expand import fixtures and cross-language contract coverage.
- Complete the external clean-machine Windows/WebView2 qualification for the signed installer.
- Configure a suitable trusted Authenticode certificate; unsigned future tags remain blocked.
- Preserve concise, evidence-linked release notes for every public tag.
- Collect prospective evidence only under a separately registered protocol.

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
