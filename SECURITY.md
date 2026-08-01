# Security policy

## Supported version

Security fixes are applied to the latest published DrawScope release. Older portable builds should be upgraded before reporting an issue.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/NouraldinFarge/drawscope/security/advisories/new). Do not open a public issue for a suspected vulnerability, credential exposure, unsafe import behavior, or path-handling flaw.

Include the affected version, a minimal reproduction, expected impact, and any relevant non-sensitive logs. Please do not include private datasets or credentials.

## Security boundaries

DrawScope treats imported pages, archives, database inputs, and analytics responses as untrusted. The desktop authority validates input, owns persistence and process boundaries, and keeps user data local. DrawScope does not automate access to sources whose terms prohibit automated collection.

The detailed trust model and operating decisions are documented in [`docs/SECURITY.md`](docs/SECURITY.md).

