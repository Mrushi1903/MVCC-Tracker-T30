import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Player = {
  id: number
  name: string
  short_name: string
  team: 'MM' | 'HB'
  jersey_number: number
  cc_player_id: string
  is_external: boolean
}

export type Match = {
  id: number
  tournament_id: number
  match_number: number
  date: string
  time: string
  opponent: string
  opponent_short: string | null
  ground: string
  result: 'won' | 'lost' | 'tied' | 'no_result' | null
  mvcc_score: string | null
  opponent_score: string | null
  potm_player_id: number | null
  is_played: boolean
  playing_12: number[] | null
}

export type Tournament = {
  id: number
  name: string
  short_name: string
  format: 'T30' | 'T20' | 'T10'
  year: number
  status: 'active' | 'upcoming' | 'completed'
  team_pin: string | null
  created_at?: string
}

// Fetch a single tournament by short_name (e.g. 'T30').
// Cached per short_name across the SPA so we don't pay the round-trip on every page.
const tournamentCache = new Map<string, Promise<Tournament | null>>()
export function fetchTournament(shortName: string): Promise<Tournament | null> {
  if (!tournamentCache.has(shortName)) {
    const p: Promise<Tournament | null> = Promise.resolve(
      supabase
        .from('tournaments')
        .select('*')
        .eq('short_name', shortName)
        .maybeSingle()
    ).then(({ data }) => (data as Tournament | null) ?? null)
    tournamentCache.set(shortName, p)
  }
  return tournamentCache.get(shortName)!
}

export type Performance = {
  id: number
  match_id: number
  player_id: number
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  dismissed: boolean
  overs_bowled: number
  runs_conceded: number
  wickets: number
  maidens: number
  catches: number
  runout_fielder: number
  runout_helper: number
  stumpings: number
  batting_points: number
  bowling_points: number
  fielding_points: number
  bonus_points: number
  availability_points: number
  total_points: number
  is_potm: boolean
  how_out: string | null
  fielder: string | null
  bowler_name: string | null
  wides: number
  no_balls: number
  dot_balls: number
}

export type OpponentBatting = {
  id: number
  match_id: number
  player_name: string
  runs: number
  balls: number
  fours: number
  sixes: number
  how_out: string
  fielder: string | null
  bowler_name: string | null
}

export type OpponentBowling = {
  id: number
  match_id: number
  player_name: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  wides: number
  no_balls: number
  dot_balls: number
}

export type FallOfWicket = {
  id: number
  match_id: number
  innings: 'mvcc' | 'opponent'
  wicket_number: number
  score: number
  over_number: string | null
  batsman_name: string | null
}

export type MatchExtras = {
  id: number
  match_id: number
  innings: 'mvcc' | 'opponent'
  byes: number
  leg_byes: number
  wides: number
  no_balls: number
  penalty: number
  total_extras: number
}

export type AvailabilityStatus = 'available' | 'not_available' | 'tentative'

export type Availability = {
  id: number
  tournament_id: number | null
  match_id: number
  player_id: number
  status: AvailabilityStatus
  note: string | null
  submitted_at: string
}
