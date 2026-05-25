-- MVCC migration 004: dismissal data on performances + fall_of_wickets + match_extras
-- Run in Supabase SQL Editor.

-- 1) MVCC performance — dismissal + bowling extras
ALTER TABLE performances
  ADD COLUMN IF NOT EXISTS how_out      text,
  ADD COLUMN IF NOT EXISTS fielder      text,
  ADD COLUMN IF NOT EXISTS bowler_name  text,
  ADD COLUMN IF NOT EXISTS wides        int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_balls     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dot_balls    int NOT NULL DEFAULT 0;

-- 2) Mirror dismissal fields on opponent batting (so we can render "c X b Y" for opp batsmen too)
ALTER TABLE opponent_batting
  ADD COLUMN IF NOT EXISTS fielder      text,
  ADD COLUMN IF NOT EXISTS bowler_name  text;

-- 3) Opponent bowling — wides / no balls / dot balls
ALTER TABLE opponent_bowling
  ADD COLUMN IF NOT EXISTS wides        int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_balls     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dot_balls    int NOT NULL DEFAULT 0;

-- 4) Fall of wickets
CREATE TABLE IF NOT EXISTS fall_of_wickets (
  id            serial PRIMARY KEY,
  match_id      int NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings       text NOT NULL CHECK (innings IN ('mvcc', 'opponent')),
  wicket_number int NOT NULL,
  score         int NOT NULL,
  over_number   text,
  batsman_name  text
);
CREATE INDEX IF NOT EXISTS idx_fow_match ON fall_of_wickets(match_id);

-- 5) Match extras (one row per innings per match)
CREATE TABLE IF NOT EXISTS match_extras (
  id            serial PRIMARY KEY,
  match_id      int NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings       text NOT NULL CHECK (innings IN ('mvcc', 'opponent')),
  byes          int NOT NULL DEFAULT 0,
  leg_byes      int NOT NULL DEFAULT 0,
  wides         int NOT NULL DEFAULT 0,
  no_balls      int NOT NULL DEFAULT 0,
  penalty       int NOT NULL DEFAULT 0,
  total_extras  int NOT NULL DEFAULT 0,
  UNIQUE (match_id, innings)
);
CREATE INDEX IF NOT EXISTS idx_extras_match ON match_extras(match_id);

-- 6) RLS
ALTER TABLE fall_of_wickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_extras    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fow_select_all" ON fall_of_wickets;
CREATE POLICY "fow_select_all" ON fall_of_wickets FOR SELECT USING (true);
DROP POLICY IF EXISTS "fow_write_all"  ON fall_of_wickets;
CREATE POLICY "fow_write_all"  ON fall_of_wickets FOR ALL    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "extras_select_all" ON match_extras;
CREATE POLICY "extras_select_all" ON match_extras FOR SELECT USING (true);
DROP POLICY IF EXISTS "extras_write_all"  ON match_extras;
CREATE POLICY "extras_write_all"  ON match_extras FOR ALL    USING (true) WITH CHECK (true);
