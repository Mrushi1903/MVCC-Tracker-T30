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
}

export type Match = {
  id: number
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
  total_points: number
  is_potm: boolean
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
}

export type OpponentBowling = {
  id: number
  match_id: number
  player_name: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
}
