# Dependency policy

Dependabot groups compatible minor and patch updates by ecosystem. Every group must pass the complete repository verification gate before merge.

Automated version-update pull requests intentionally exclude semantic-major upgrades. Major upgrades are reviewed deliberately against migration notes, data compatibility, release behavior, and rollback plans. Security updates remain enabled and are evaluated independently of this cadence.

GitHub Actions are pinned to immutable commit identities with their release tag noted in comments. Dependabot may propose monthly action updates; maintainers verify the upstream repository and release notes before merge.

The dedicated dependency-audit workflow covers the complete pnpm lockfile, the frozen uv runtime-and-development graph, and the complete Cargo lockfile. Known vulnerabilities fail their language-specific job. RustSec informational warnings are reviewed in full and may remain only when target reachability and the lack of a compatible fix are documented; they are never hidden behind an unrecorded ignore. See [`docs/DEPENDENCY-AUDIT.md`](docs/DEPENDENCY-AUDIT.md) for the reproducible commands and dated evidence.
