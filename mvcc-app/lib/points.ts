// MVCC Tournament Points Engine
// All scoring rules baked in

export interface PerformanceInput {
  // Batting
  runs: number
  balls_faced: number
  // Bowling
  overs_bowled: number
  runs_conceded: number
  wickets: number
  // Fielding
  catches: number
  runout_fielder: number
  runout_helper: number
  stumpings: number
  // Awards
  is_potm: boolean
  is_mvp?: boolean
}

export interface PointsBreakdown {
  // Batting
  run_points: number
  batting_milestone_bonus: number
  // Bowling
  wicket_points: number
  bowling_economy_bonus: number
  // Fielding
  catch_points: number
  runout_fielder_points: number
  runout_helper_points: number
  stumping_points: number
  // Awards
  potm_points: number
  mvp_points: number
  // Totals
  batting_points: number
  bowling_points: number
  fielding_points: number
  bonus_points: number
  total_points: number
}

export function calculatePoints(perf: PerformanceInput): PointsBreakdown {
  // ── BATTING ──────────────────────────────────────
  const run_points = perf.runs * 1

  // Milestone bonuses (stackable — 100+ gets 30+10+10 = 50? No — they're tiers)
  // Rules: 30+ = +10, 50+ = +20, 100+ = +40 (these are the bonus on top of runs)
  let batting_milestone_bonus = 0
  if (perf.runs >= 100) batting_milestone_bonus = 40
  else if (perf.runs >= 50) batting_milestone_bonus = 20
  else if (perf.runs >= 30) batting_milestone_bonus = 10

  const batting_points = run_points + batting_milestone_bonus

  // ── BOWLING ──────────────────────────────────────
  // Must bowl minimum 1 complete over for bowling points to count
  const bowled_enough = perf.overs_bowled >= 1

  const wicket_points = bowled_enough ? perf.wickets * 20 : 0

  // Economy bonus: economy < 4 AND at least 1 wicket
  let bowling_economy_bonus = 0
  if (bowled_enough && perf.wickets >= 1 && perf.overs_bowled > 0) {
    const economy = perf.runs_conceded / perf.overs_bowled
    if (economy < 4) bowling_economy_bonus = 10
  }

  const bowling_points = wicket_points + bowling_economy_bonus

  // ── FIELDING ─────────────────────────────────────
  const catch_points = perf.catches * 10
  const runout_fielder_points = perf.runout_fielder * 10
  const runout_helper_points = perf.runout_helper * 5
  const stumping_points = perf.stumpings * 10

  const fielding_points = catch_points + runout_fielder_points + runout_helper_points + stumping_points

  // ── BONUS ─────────────────────────────────────────
  const potm_points = perf.is_potm ? 30 : 0
  const mvp_points = perf.is_mvp ? 50 : 0
  const bonus_points = potm_points + mvp_points

  // ── TOTAL ─────────────────────────────────────────
  const total_points = batting_points + bowling_points + fielding_points + bonus_points

  return {
    run_points,
    batting_milestone_bonus,
    wicket_points,
    bowling_economy_bonus,
    catch_points,
    runout_fielder_points,
    runout_helper_points,
    stumping_points,
    potm_points,
    mvp_points,
    batting_points,
    bowling_points,
    fielding_points,
    bonus_points,
    total_points,
  }
}

export function getStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '—'
  return ((runs / balls) * 100).toFixed(1)
}

export function getEconomy(runs: number, overs: number): string {
  if (overs === 0) return '—'
  return (runs / overs).toFixed(2)
}
