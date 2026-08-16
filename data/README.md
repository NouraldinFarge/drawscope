# DrawScope data and provenance

This directory contains the reproducible evidence snapshot bundled with DrawScope.

| Path | Purpose |
| --- | --- |
| `offline-seed.sqlite3` | Read-only seed merged into the user's local database |
| `offline-database-manifest.json` | Database identity, coverage, source hashes, retrieval context, and known gaps |
| `game-catalog.json` | Canonical game definitions and rule-era references |
| `source-catalog.json` | Provider policy and permission-gated feed map |
| `archive-freshness-policy.json` | Machine-readable update targets and automation boundaries |
| `raw/` | Immutable, hash-checked inputs used by the frozen builder |
| `fixtures/` | Small source-attributed parser and contract fixtures |

Do not edit the SQLite seed or manifest by hand. Rebuild them from the pinned artifacts:

```powershell
uv run --project engines/drawscope-engine python tools/build_offline_database.py --frozen
```

The build must produce the same database and manifest bytes twice before release. Source
data retains its own terms and is not relicensed by DrawScope's MIT code license. Read
the [database guide](../docs/DATABASE.md), [data notice](../docs/DATA-NOTICE.md), and
[source research](../docs/SOURCE-RESEARCH.md).
