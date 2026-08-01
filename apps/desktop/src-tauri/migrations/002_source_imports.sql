CREATE TABLE IF NOT EXISTS source_adapters (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  terms_url TEXT NOT NULL,
  policy_status TEXT NOT NULL,
  live_network_enabled INTEGER NOT NULL CHECK (live_network_enabled IN (0, 1)),
  parser_version TEXT NOT NULL,
  policy_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_feeds (
  id TEXT PRIMARY KEY,
  adapter_id TEXT NOT NULL REFERENCES source_adapters(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  display_name TEXT NOT NULL,
  session TEXT NOT NULL,
  path_template TEXT NOT NULL,
  first_year INTEGER NOT NULL,
  last_year INTEGER NOT NULL,
  main_count INTEGER NOT NULL,
  ordered INTEGER NOT NULL CHECK (ordered IN (0, 1)),
  optional_special TEXT,
  optional_draw_number INTEGER NOT NULL CHECK (optional_draw_number IN (0, 1)),
  notes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_imports (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL REFERENCES source_feeds(id),
  archive_year INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  status TEXT NOT NULL,
  diagnostic_code TEXT,
  UNIQUE (feed_id, archive_year, content_sha256)
);

CREATE TABLE IF NOT EXISTS drawing_metadata (
  drawing_id TEXT PRIMARY KEY REFERENCES drawings(id) ON DELETE CASCADE,
  draw_number TEXT,
  source_detail_url TEXT,
  raw_import_id TEXT REFERENCES source_imports(id)
);

CREATE INDEX IF NOT EXISTS idx_source_imports_feed_year
  ON source_imports(feed_id, archive_year DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at)
VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
