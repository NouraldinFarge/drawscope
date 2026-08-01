# Database schema

Schema version 4 uses SQLite WAL with foreign keys, a five-second busy timeout, full
synchronization, short Rust-owned transactions, and bundled SQLite. Version 4 adds
indexes for bounded drawing queries and recent job-state lookup.

- `schema_migrations` — committed schema versions
- `sources` — URL, type, retrieval time, parser, content hash, verification
- `games` — stable game identity and canonical definition JSON
- `game_eras` — date-bounded matrices and rules
- `datasets` — coverage and verification for an imported source range
- `drawings` — normalized draw identity, date/session, era, source, special value
- `drawing_numbers` — role, preserved position, and value
- `jobs` — durable job/attempt identity, state, sequence, and request hash
- `source_adapters` — provider policy, terms URL, network authorization, parser identity
- `source_feeds` — game/session URL templates, observed year range, and row shape
- `source_imports` — immutable page hash, archive year, outcome, and record count
- `drawing_metadata` — optional source draw number, detail URL, and raw import link

Main and special values are never placed in the same analytical role. Pick 3 and Pick 4 preserve position. Unique game/era/date/session keys detect duplicates, while feed/year/content-hash keys make page imports idempotent. A rejected page is rolled back as a unit. The database, `-wal`, and `-shm` files must be backed up or moved together while live.

The bundled rusqlite stack contains SQLite 3.51.3 or later; the exact runtime version is emitted by `DrawScope.exe --health-check` and recorded in release metadata.
