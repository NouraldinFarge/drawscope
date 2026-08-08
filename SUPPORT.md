# Support

DrawScope is a portfolio research application maintained on a best-effort basis. Use the path below that matches the problem; keeping reports focused helps the project remain auditable.

## Installation and startup

Before opening an issue:

1. Confirm you downloaded the ZIP from the [latest GitHub release](https://github.com/NouraldinFarge/drawscope/releases/latest).
2. Verify its SHA-256 checksum using the command in the [`README`](README.md#verify-the-download).
3. Extract the complete ZIP to a writable folder; do not run the application from inside the archive.
4. Confirm Microsoft Edge WebView2 is available on the Windows machine.
5. Start `launch-portable.bat`, then review the non-sensitive files under the portable `logs/` directory if startup fails.

Use the [bug report form](https://github.com/NouraldinFarge/drawscope/issues/new?template=bug_report.yml) for a reproducible application problem. Do not attach private archives, credentials, personal datasets, or unredacted filesystem paths.

## Data or provenance discrepancy

Use the [archive/provenance report form](https://github.com/NouraldinFarge/drawscope/issues/new?template=data_quality_report.yml) when a stored draw, date, session, source identity, documented gap, or coverage total appears incorrect. Include a public authoritative source when one is available.

The project does not accept requests to bypass provider controls or automate collection that conflicts with source terms.

## Methodology and feature proposals

Read [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md), [`docs/RESPONSIBLE-USE.md`](docs/RESPONSIBLE-USE.md), and [`docs/KNOWN-LIMITATIONS.md`](docs/KNOWN-LIMITATIONS.md) first. Feature requests must remain retrospective and must not present historical frequency, a confidence score, or any generated combination as a future winning probability.

## Security reports

Suspected vulnerabilities, unsafe import behavior, credential exposure, or path-handling flaws must use [GitHub private vulnerability reporting](https://github.com/NouraldinFarge/drawscope/security/advisories/new). Do not disclose them in a public issue.
