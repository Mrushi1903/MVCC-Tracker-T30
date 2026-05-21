// CSV Scorecard Parser for CricClub exports
// Handles the exact format of CricClub CSV scorecard exports

export interface ParsedPlayerStats {
  short_name: string
  full_name: string
  // Batting
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  // Bowling
  overs_bowled: number
  runs_conceded: number
  wickets: number
  maidens: number
  // Fielding
  catches: number
  runout_fielder: number
  runout_helper: number
  stumpings: number
  is_potm: boolean
}

export interface ParsedMatch {
  result: 'won' | 'lost' | 'tied' | 'no_result'
  mvcc_score: string
  opponent_score: string
  players: ParsedPlayerStats[]
}

// All MVCC player name variants → short name
const PLAYER_MAP: Record<string, string> = {
  'viswanath kasu': 'Viswa',
  'amarendra nuvvala': 'Amar',
  'rushi vardan reddy maddi': 'Rushi',
  'rushi vardan reddy m': 'Rushi',
  'rushi vardan reddy': 'Rushi',
  'akshay raju': 'Akshay',
  'akshay r': 'Akshay',
  'rupendra chowdary palakurthi': 'Rupendra',
  'rupendra chowdary': 'Rupendra',
  'naveen kumar peddi': 'Naveen',
  'siddharth chawla': 'Siddarth',
  'rahul menon': 'Rahul',
  'nithin reddy musku': 'Nithin',
  'nithin reddy': 'Nithin',
  'rohith maddipati': 'Rohith',
  'rohith m': 'Rohith',
  'kousik dhanekula': 'Koushik',
  'naresh sunder': 'Naresh',
  // Hell Boys
  'sai manoj kagolanu': 'Manoj',
  'mahender bureddy': 'Mahendra',
  'siva ganesh asodi': 'Gani',
  'gani siva ganesh asodi': 'Gani',
  'raheel shaik': 'Raheel',
  'ravi kumar pattipati': 'Ravi',
  'yeshwanth kumar mutcherla': 'Yeswanth',
  'hemanth kasa': 'Hemanth',
  'karthik balakrishna': 'Karthik',
  'nikhil pasula': 'Nikhil',
  'saran damacharla': 'Saran',
  'suman reddy gaddam': 'Suman',
  'vamsi krishna koneru': 'Vamsi',
}

function findShortName(name: string): string | null {
  if (!name) return null
  const lower = name.toLowerCase().trim()
  // Direct match
  if (PLAYER_MAP[lower]) return PLAYER_MAP[lower]
  // Partial match — check if any map key is contained in the name or vice versa
  for (const [key, val] of Object.entries(PLAYER_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return val
  }
  return null
}

function parseOvers(s: string): number {
  const cleaned = s?.trim() || '0'
  return parseFloat(cleaned) || 0
}

function createEmptyPlayer(shortName: string, fullName: string): ParsedPlayerStats {
  return {
    short_name: shortName,
    full_name: fullName,
    runs: 0, balls_faced: 0, fours: 0, sixes: 0,
    overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0,
    catches: 0, runout_fielder: 0, runout_helper: 0, stumpings: 0,
    is_potm: false,
  }
}

export function parseCricClubCSV(csvText: string): ParsedMatch {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)

  const playerMap = new Map<string, ParsedPlayerStats>()

  let result: 'won' | 'lost' | 'tied' | 'no_result' = 'no_result'
  let mvcc_score = ''
  let opponent_score = ''

  // Detect result from first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('mavericks cricket club mvcc won') || lower.includes('mvcc won')) {
      result = 'won'; break
    } else if (lower.includes('won by')) {
      result = 'lost'; break
    } else if (lower.includes('tied') || lower.includes('no result')) {
      result = 'tied'; break
    }
  }

  type Section = 'none' | 'mvcc_batting' | 'opp_bowling' | 'opp_batting' | 'mvcc_bowling'
  let section: Section = 'none'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // ── SECTION DETECTION ───────────────────────────────
    if (lower.includes('mavericks cricket club mvcc batting') || lower.includes('mavericks cricket club mvcc - batting')) {
      section = 'mvcc_batting'; continue
    }
    if (lower.includes('michigan rangers') && lower.includes('bowling')) {
      section = 'opp_bowling'; continue
    }
    if (lower.includes('michigan rangers') && lower.includes('batting')) {
      section = 'opp_batting'; continue
    }
    if (lower.includes('mavericks cricket club mvcc bowling') || lower.includes('mavericks cricket club mvcc - bowling')) {
      section = 'mvcc_bowling'; continue
    }

    // Skip header rows
    if (lower.startsWith('batsman') || lower.startsWith('bowler,overs') || lower.startsWith('s.no')) continue

    // ── MVCC BATTING ─────────────────────────────────────
    // CSV columns: PlayerName, HowOut, Fielder, Bowler, Runs, Balls, Fours, Sixes
    if (section === 'mvcc_batting') {
      if (lower.includes('byes:')) {
        // Score summary line — extract MVCC total
        const parts = line.split(',').map(p => p.trim())
        const runs = parts[parts.length - 2]
        const overs = parts[parts.length - 1]
        if (runs && overs && !isNaN(Number(runs))) {
          const wicketMatch = line.match(/wickets\s*:\s*(\d+)/i)
          const wkts = wicketMatch ? wicketMatch[1] : '10'
          mvcc_score = `${runs}/${wkts} (${overs} Overs)`
        }
        continue
      }

      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 6) continue

      // Remove leading tab that CricClub sometimes adds
      const fullName = parts[0].replace(/^\t/, '').trim()
      const shortName = findShortName(fullName)
      if (!shortName) continue

      const runs = parseInt(parts[4]) || 0
      const balls = parseInt(parts[5]) || 0
      const fours = parseInt(parts[6]) || 0
      const sixes = parseInt(parts[7]) || 0

      const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
      player.runs = runs
      player.balls_faced = balls
      player.fours = fours
      player.sixes = sixes
      playerMap.set(shortName, player)
    }

    // ── OPPONENT BATTING — extract MVCC fielding ──────────
    // CSV columns: PlayerName, HowOut, Fielder, Bowler, Runs, Balls, Fours, Sixes
    // HowOut values: 'ct' (catch), 'ctw' (caught behind/stumped), 'ro' (runout), 'b', 'lbw', 'not out', etc.
    if (section === 'opp_batting') {
      if (lower.includes('byes:')) {
        const parts = line.split(',').map(p => p.trim())
        const runs = parts[parts.length - 2]
        const overs = parts[parts.length - 1]
        if (runs && overs && !isNaN(Number(runs))) {
          const wicketMatch = line.match(/wickets\s*:\s*(\d+)/i)
          const wkts = wicketMatch ? wicketMatch[1] : '10'
          opponent_score = `${runs}/${wkts} (${overs} Overs)`
        }
        continue
      }

      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 3) continue

      // parts[1] = how out, parts[2] = fielder name (for ct/ctw/ro)
      const howOut = parts[1]?.toLowerCase().trim() || ''
      const fielderRaw = parts[2]?.trim() || ''

      if (howOut === 'ct' && fielderRaw) {
        // Catch: fielderRaw is the MVCC player who took the catch
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          p.catches += 1
          playerMap.set(short, p)
        }
      }

      if (howOut === 'ctw' && fielderRaw) {
        // Stumping / caught behind: fielderRaw is the MVCC wicketkeeper
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          p.stumpings += 1
          playerMap.set(short, p)
        }
      }

      if ((howOut === 'ro' || howOut === 'run out') && fielderRaw) {
        // Run out: fielderRaw is the primary fielder (gets 10 pts)
        // If there's a second fielder in parts[3], they get runout_helper (5 pts)
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          p.runout_fielder += 1
          playerMap.set(short, p)
        }
        // Optional: second fielder involved in run out gets helper credit
        const helperRaw = parts[3]?.trim() || ''
        if (helperRaw && howOut === 'ro') {
          const helperShort = findShortName(helperRaw)
          // Only credit as helper if they are a different player from the primary fielder
          if (helperShort && helperShort !== findShortName(fielderRaw)) {
            const ph = playerMap.get(helperShort) || createEmptyPlayer(helperShort, helperRaw)
            ph.runout_helper += 1
            playerMap.set(helperShort, ph)
          }
        }
      }
    }

    // ── MVCC BOWLING ──────────────────────────────────────
    // CSV columns: BowlerName, Overs, Maidens, Runs, Wickets, Wides, NoBalls, Hattricks, DotBalls
    if (section === 'mvcc_bowling') {
      if (lower.startsWith('total') || lower.startsWith('extras')) continue

      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 5) continue

      const fullName = parts[0].replace(/^\t/, '').trim()
      const shortName = findShortName(fullName)
      if (!shortName) continue

      const overs = parseOvers(parts[1])
      const maidens = parseInt(parts[2]) || 0
      const runs = parseInt(parts[3]) || 0
      const wickets = parseInt(parts[4]) || 0

      const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
      player.overs_bowled = overs
      player.maidens = maidens
      player.runs_conceded = runs
      player.wickets = wickets
      playerMap.set(shortName, player)
    }
  }

  // Auto POTM: highest-scoring MVCC player with 30+ runs
  // (Admin can override this in the UI)
  let topRuns = 0
  let topShort = ''
  Array.from(playerMap.entries()).forEach(([name, stats]) => {
    if (stats.runs > topRuns) {
      topRuns = stats.runs
      topShort = name
    }
  })
  if (topShort && topRuns >= 30) {
    const p = playerMap.get(topShort)!
    p.is_potm = true
    playerMap.set(topShort, p)
  }

  return {
    result,
    mvcc_score,
    opponent_score,
    players: Array.from(playerMap.values()),
  }
}
