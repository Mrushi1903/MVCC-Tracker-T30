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
  // Partial match - check if any key is contained in the name or vice versa
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

  // Detect result from first line
  const firstLine = lines[0]?.toLowerCase() || ''
  if (firstLine.includes('mavericks cricket club mvcc won') || firstLine.includes('mvcc won')) {
    result = 'won'
  } else if (firstLine.includes('won by')) {
    result = 'lost'
  } else if (firstLine.includes('tied') || firstLine.includes('no result')) {
    result = 'tied'
  }

  // Section tracking
  type Section = 'none' | 'mvcc_batting' | 'opp_bowling' | 'opp_batting' | 'mvcc_bowling'
  let section: Section = 'none'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // Section detection
    if (lower.includes('mavericks cricket club mvcc batting')) {
      section = 'mvcc_batting'; continue
    }
    if (lower.includes('michigan rangers') && lower.includes('bowling')) {
      section = 'opp_bowling'; continue
    }
    if (lower.includes('michigan rangers') && lower.includes('batting')) {
      section = 'opp_batting'; continue
    }
    if (lower.includes('mavericks cricket club mvcc bowling')) {
      section = 'mvcc_bowling'; continue
    }

    // Skip header rows
    if (lower.includes('batsman') || lower.includes('bowler,overs')) continue

    // ── MVCC BATTING ────────────────────────────────────
    // Format: PlayerName, HowOut, Fielder, Bowler, Runs, Balls, Fours, Sixers
    if (section === 'mvcc_batting') {
      // Detect score line: "Byes: 1 , Leg Byes:..."
      if (lower.includes('byes:')) {
        // Extract MVCC total: last two tokens are total runs and overs
        const parts = line.split(',').map(p => p.trim())
        const runs = parts[parts.length - 2]
        const overs = parts[parts.length - 1]
        if (runs && overs && !isNaN(Number(runs))) {
          // Get wickets from line
          const wicketMatch = line.match(/wickets\s*:\s*(\d+)/i)
          const wkts = wicketMatch ? wicketMatch[1] : '10'
          mvcc_score = `${runs}/${wkts} (${overs})`
        }
        continue
      }

      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 6) {
        const fullName = parts[0].replace(/^\t/, '').trim()
        const shortName = findShortName(fullName)
        if (!shortName) continue

        const howOut = parts[1]?.toLowerCase() || ''
        const fielder = parts[2]?.trim() || ''
        const runs = parseInt(parts[4]) || 0
        const balls = parseInt(parts[5]) || 0
        const fours = parseInt(parts[6]) || 0
        const sixes = parseInt(parts[7]) || 0

        const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
        player.runs = runs
        player.balls_faced = balls
        player.fours = fours
        player.sixes = sixes

        // Fielding from how out
        if (howOut === 'ct' && fielder) {
          // This is a catch taken by fielder (opponent player — ignore for our purposes)
        }
        if (howOut === 'ctw') {
          // Caught behind (stumping counts handled in opp batting)
        }

        playerMap.set(shortName, player)
      }
    }

    // ── OPPONENT BATTING — extract MVCC fielding ────────
    // Format: PlayerName, HowOut, Fielder, Bowler, Runs, Balls, Fours, Sixers
    if (section === 'opp_batting') {
      if (lower.includes('byes:')) {
        // Extract opponent score
        const parts = line.split(',').map(p => p.trim())
        const runs = parts[parts.length - 2]
        const overs = parts[parts.length - 1]
        if (runs && overs && !isNaN(Number(runs))) {
          const wicketMatch = line.match(/wickets\s*:\s*(\d+)/i)
          const wkts = wicketMatch ? wicketMatch[1] : '10'
          opponent_score = `${runs}/${wkts} (${overs})`
        }
        continue
      }

      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 4) {
        const howOut = parts[1]?.toLowerCase() || ''
        const fielder = parts[2]?.trim() || ''

        if (howOut === 'ct' && fielder) {
          // Catch taken by MVCC fielder
          const short = findShortName(fielder)
          if (short) {
            const p = playerMap.get(short) || createEmptyPlayer(short, fielder)
            p.catches += 1
            playerMap.set(short, p)
          }
        }

        if (howOut === 'ctw' && fielder) {
          // Stumping/caught behind by MVCC keeper
          const short = findShortName(fielder)
          if (short) {
            const p = playerMap.get(short) || createEmptyPlayer(short, fielder)
            p.stumpings += 1
            playerMap.set(short, p)
          }
        }

        if (howOut === 'ro' && fielder) {
          // Run out by MVCC fielder
          const short = findShortName(fielder)
          if (short) {
            const p = playerMap.get(short) || createEmptyPlayer(short, fielder)
            p.runout_fielder += 1
            playerMap.set(short, p)
          }
        }
      }
    }

    // ── MVCC BOWLING ────────────────────────────────────
    // Format: Bowler, Overs, Maidens, Runs, Wickets, Wides, NoBalls, Hattricks, DotBalls
    if (section === 'mvcc_bowling') {
      if (lower.startsWith('total')) continue

      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 5) {
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
  }

  // Auto POTM: highest scorer with 30+ runs
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
