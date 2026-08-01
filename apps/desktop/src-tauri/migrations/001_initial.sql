PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  verification_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  verification_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_eras (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  effective_start TEXT,
  effective_end TEXT,
  rules_json TEXT NOT NULL,
  verification_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  era_id TEXT NOT NULL,
  first_draw TEXT NOT NULL,
  last_draw TEXT NOT NULL,
  draw_count INTEGER NOT NULL CHECK (draw_count >= 0),
  verification_status TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  era_id TEXT NOT NULL,
  draw_date TEXT NOT NULL,
  session TEXT NOT NULL,
  special_number INTEGER,
  multiplier INTEGER,
  source_id TEXT NOT NULL REFERENCES sources(id),
  verification_status TEXT NOT NULL,
  UNIQUE (game_id, era_id, draw_date, session)
);

CREATE TABLE IF NOT EXISTS drawing_numbers (
  drawing_id TEXT NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('main', 'special')),
  position INTEGER NOT NULL CHECK (position >= 0),
  value INTEGER NOT NULL,
  PRIMARY KEY (drawing_id, role, position)
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  state TEXT NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  request_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drawings_game_date
  ON drawings(game_id, draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_drawing_numbers_value
  ON drawing_numbers(role, value);

INSERT OR IGNORE INTO schema_migrations(version, applied_at)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
