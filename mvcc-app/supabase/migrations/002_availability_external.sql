-- MVCC migration 002: availability + external players + playing 12
-- Run this in the Supabase SQL editor.

-- 1) Mark certain players as external (their points do NOT count toward team totals)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;

-- 2) Pre-computed availability bonus per performance
ALTER TABLE performances
  ADD COLUMN IF NOT EXISTS availability_points int NOT NULL DEFAULT 0;

-- 3) Playing-12 array per match (player IDs)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS playing_12 int[] NOT NULL DEFAULT '{}';

-- 4) Availability submissions (one row per player per match)
CREATE TABLE IF NOT EXISTS availability (
  id            bigserial PRIMARY KEY,
  tournament_id int         NULL,
  match_id      int         NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status        text        NOT NULL CHECK (status IN ('available', 'not_available', 'tentative')),
  note          text        NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_match  ON availability(match_id);
CREATE INDEX IF NOT EXISTS idx_availability_player ON availability(player_id);

-- 5) RLS — public can read + upsert their own availability (form is PIN-gated, not auth-gated).
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_select_all" ON availability;
CREATE POLICY "availability_select_all" ON availability
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "availability_insert_all" ON availability;
CREATE POLICY "availability_insert_all" ON availability
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "availability_update_all" ON availability;
CREATE POLICY "availability_update_all" ON availability
  FOR UPDATE USING (true) WITH CHECK (true);
