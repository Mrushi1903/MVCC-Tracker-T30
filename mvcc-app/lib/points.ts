// MVCC Tournament Points Engine
// All scoring rules baked in.

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
  // Availability — pre-computed by admin on Playing-12 save
  // (+10 if player was available but not picked in the Playing-12).
  availability_points?: number
}

export interface PointsBreakdown {
  // Batting
  run_points: number
  batting_milestone_bonus: number
  strike_rate_bonus: number
  // Bowling
  wicket_points: number
  bowling_economy_bonus: number
  bowling_economy_bonus_zero_wickets: number
  three_wicket_bonus: number
  five_wicket_bonus: number
  // Fielding
  catch_points: number
  runout_fielder_points: number
  runout_helper_points: number
  stumping_points: number
  // Awards
  potm_points: number
  mvp_points: number
  availability_points: number
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

  // Tiered milestone bonus (highest only)
  let batting_milestone_bonus = 0
  if (perf.runs >= 100) batting_milestone_bonus = 40
  else if (perf.runs >= 50) batting_milestone_bonus = 20
  else if (perf.runs >= 30) batting_milestone_bonus = 10

  // Strike-rate bonus: 25+ runs AND SR >= 135 → round(5 * SR / 135)
  let strike_rate_bonus = 0
  if (perf.runs >= 25 && perf.balls_faced > 0) {
    const strikeRate = (perf.runs / perf.balls_faced) * 100
    if (strikeRate >= 135) {
      strike_rate_bonus = Math.round((5 * strikeRate) / 135)
    }
  }

  const batting_points = run_points + batting_milestone_bonus + strike_rate_bonus

  // ── BOWLING ──────────────────────────────────────
  const bowled_enough = perf.overs_bowled >= 1
  const wicket_points = bowled_enough ? perf.wickets * 20 : 0

  // Economy bonus (with wickets): <4 econ + >=1 wkt + >=1 over → +10
  let bowling_economy_bonus = 0
  if (bowled_enough && perf.wickets >= 1 && perf.overs_bowled > 0) {
    const economy = perf.runs_conceded / perf.overs_bowled
    if (economy < 4) bowling_economy_bonus = 10
  }

  // Economy bonus (no wickets): 0 wickets + >=2 overs + econ <6 → round((6 - econ) * 5)
  let bowling_economy_bonus_zero_wickets = 0
  if (perf.wickets === 0 && perf.overs_bowled >= 2) {
    const economy = perf.runs_conceded / perf.overs_bowled
    if (economy < 6) {
      bowling_economy_bonus_zero_wickets = Math.round((6 - economy) * 5)
    }
  }

  // Haul bonuses (highest only — a 5-fer doesn't also count as a 3-fer)
  let three_wicket_bonus = 0
  let five_wicket_bonus = 0
  if (bowled_enough) {
    if (perf.wickets >= 5) five_wicket_bonus = 40
    else if (perf.wickets >= 3) three_wicket_bonus = 20
  }

  const bowling_points =
    wicket_points +
    bowling_economy_bonus +
    bowling_economy_bonus_zero_wickets +
    three_wicket_bonus +
    five_wicket_bonus

  // ── FIELDING ─────────────────────────────────────
  const catch_points = perf.catches * 10
  const runout_fielder_points = perf.runout_fielder * 10
  const runout_helper_points = perf.runout_helper * 5
  const stumping_points = perf.stumpings * 10

  const fielding_points =
    catch_points + runout_fielder_points + runout_helper_points + stumping_points

  // ── BONUS ─────────────────────────────────────────
  const potm_points = perf.is_potm ? 30 : 0
  const mvp_points = perf.is_mvp ? 50 : 0
  const availability_points = perf.availability_points ?? 0
  const bonus_points = potm_points + mvp_points + availability_points

  // ── TOTAL ─────────────────────────────────────────
  const total_points = batting_points + bowling_points + fielding_points + bonus_points

  return {
    run_points,
    batting_milestone_bonus,
    strike_rate_bonus,
    wicket_points,
    bowling_economy_bonus,
    bowling_economy_bonus_zero_wickets,
    three_wicket_bonus,
    five_wicket_bonus,
    catch_points,
    runout_fielder_points,
    runout_helper_points,
    stumping_points,
    potm_points,
    mvp_points,
    availability_points,
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
