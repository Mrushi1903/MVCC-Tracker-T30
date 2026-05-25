-- MVCC migration 003: multi-tournament support.
-- Run this in the Supabase SQL editor BEFORE deploying the new code.

-- 1) Tournaments registry
CREATE TABLE IF NOT EXISTS tournaments (
  id          serial PRIMARY KEY,
  name        text   NOT NULL,
  short_name  text   NOT NULL UNIQUE,
  format      text   NOT NULL CHECK (format IN ('T30', 'T20', 'T10')),
  year        int    NOT NULL,
  status      text   NOT NULL DEFAULT 'upcoming'
                CHECK (status IN ('active', 'upcoming', 'completed')),
  team_pin    text   NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_read_all"  ON tournaments;
CREATE POLICY "tournaments_read_all"  ON tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournaments_write_all" ON tournaments;
CREATE POLICY "tournaments_write_all" ON tournaments FOR ALL USING (true) WITH CHECK (true);

-- 2) Seed T30 and T20 (idempotent via ON CONFLICT on short_name)
INSERT INTO tournaments (name, short_name, format, year, status)
VALUES
  ('Internal T30 2026', 'T30', 'T30', 2026, 'active'),
  ('Internal T20 2026', 'T20', 'T20', 2026, 'upcoming')
ON CONFLICT (short_name) DO NOTHING;

-- 3) Link matches → tournaments
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS tournament_id int REFERENCES tournaments(id);

-- Backfill existing matches to the T30 row.
UPDATE matches
   SET tournament_id = (SELECT id FROM tournaments WHERE short_name = 'T30')
 WHERE tournament_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);

-- 4) availability_points on performances (no-op if migration 002 already ran)
ALTER TABLE performances
  ADD COLUMN IF NOT EXISTS availability_points int NOT NULL DEFAULT 0;
