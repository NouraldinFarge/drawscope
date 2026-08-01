CREATE INDEX IF NOT EXISTS idx_drawings_game_session_date
  ON drawings(game_id, session, draw_date DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_state_updated
  ON jobs(state, updated_at DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at)
VALUES (4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
