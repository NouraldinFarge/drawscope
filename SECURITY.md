# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest published release | Yes |
| Older portable releases | No—upgrade before reporting |

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/NouraldinFarge/drawscope/security/advisories/new). Do not open a public issue for a suspected vulnerability, credential exposure, unsafe import behavior, or path-handling flaw.

Include the affected version, a minimal reproduction, expected impact, and any relevant non-sensitive logs. Please do not include private datasets, credentials, access tokens, or unredacted personal filesystem paths.

Reports should cover a concrete security boundary such as archive extraction, saved-page import, path resolution, SQLite migration, sidecar execution, contract validation, or release integrity. Lottery-number accuracy and statistical methodology questions are not security vulnerabilities.

## Security boundaries

DrawScope treats imported pages, archives, database inputs, and analytics responses as untrusted. The desktop authority validates input, owns persistence and process boundaries, and keeps user data local. DrawScope does not automate access to sources whose terms prohibit automated collection.

The detailed trust model and operating decisions are documented in
[`docs/SECURITY.md`](docs/SECURITY.md). Future tagged releases fail closed unless the
desktop executable, analytics sidecar, and NSIS installer pass trusted Authenticode
verification; the existing `v0.6.5` portable release is explicitly documented as
unsigned.
