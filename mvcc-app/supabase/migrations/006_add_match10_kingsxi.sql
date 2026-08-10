-- MVCC migration 006: add the Quarter Final to the T30 2026 schedule.
-- Opponent: Farmington CC Kings XI (FCXI), Aug 15 2026, Jayne.
-- Run this in the Supabase SQL editor. Idempotent — safe to re-run.
--
-- This is a knockout game. A new nullable `stage` column carries the display
-- label ("Quarter Final"); match_number stays 10 purely for chronological
-- ordering and is never shown for staged games. All schedule/availability/
-- admin pages read the matches table live, so this migration alone makes the
-- Quarter Final appear everywhere labelled correctly.

-- 1) Knockout-stage label column (null for regular league games).
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage text;

-- 2) Insert the Quarter Final if it isn't there yet.
INSERT INTO matches (tournament_id, match_number, stage, date, time, opponent, opponent_short, ground, is_played)
SELECT
  (SELECT id FROM tournaments WHERE short_name = 'T30'),
  10,
  'Quarter Final',
  '2026-08-15',
  '9:00 AM',
  'Farmington CC Kings XI',
  'FCXI',
  'Jayne',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM matches
  WHERE match_number = 10
    AND tournament_id = (SELECT id FROM tournaments WHERE short_name = 'T30')
);

-- 3) Backfill the label in case the row was already inserted (earlier draft
--    of this migration) without a stage.
UPDATE matches
   SET stage = 'Quarter Final'
 WHERE match_number = 10
   AND tournament_id = (SELECT id FROM tournaments WHERE short_name = 'T30')
   AND (stage IS NULL OR stage = '');
