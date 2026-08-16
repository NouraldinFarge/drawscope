# DrawScope maintenance tools

These scripts turn repository policies into repeatable checks.

| Tool | Responsibility |
| --- | --- |
| `build_offline_database.py` | Reconstruct and verify the SQLite archive from approved, pinned evidence |
| `check_archive_freshness.py` | Evaluate dated coverage against the machine-readable freshness policy |
| `update_freshness_issue.py` | Maintain one GitHub data-quality issue from the freshness report |
| `verify_analysis_evidence.py` | Validate the packaged result, archive identity, leakage boundaries, and confidence contract |
| `Test-WindowsInstaller.ps1` | Guarded NSIS install/run/uninstall and user-data-preservation qualification |
| `clean-generated.ps1` | Remove only known reproducible workspace output and caches |

Release orchestration remains at [`../BUILD-LATEST.ps1`](../BUILD-LATEST.ps1). Run tools
from the repository root so their fixed path guards and catalogs resolve correctly. See
the [maintenance policy](../docs/MAINTENANCE.md),
[distribution guide](../docs/DISTRIBUTION.md), and [runbooks](../docs/RUNBOOKS.md).
