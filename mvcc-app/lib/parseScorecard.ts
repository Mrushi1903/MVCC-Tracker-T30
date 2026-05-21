// PDF Scorecard Parser for CricClub scorecards
// Parses text extracted from PDF and maps to player stats

export interface ParsedPlayerStats {
  name: string
  short_name: string
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  overs_bowled: number
  runs_conceded: number
  wickets: number
  maidens: number
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

// MVCC player name variations → short name mapping
const PLAYER_MAP: Record<string, string> = {
  'viswanath kasu': 'Viswa',
  'amarendra nuvvala': 'Amar',
  'rushi vardan reddy maddi': 'Rushi',
  'rushi vardan reddy': 'Rushi',
  'akshay raju': 'Akshay',
  'rupendra chowdary palakurthi': 'Rupendra',
  'rupendra chowdary': 'Rupendra',
  'naveen kumar peddi': 'Naveen',
  'siddharth chawla': 'Siddarth',
  'rahul menon': 'Rahul',
  'nithin reddy musku': 'Nithin',
  'nithin reddy': 'Nithin',
  'rohith maddipati': 'Rohith',
  'kousik dhanekula': 'Koushik',
  'naresh sunder': 'Naresh',
  // MM players
  'sai manoj kagolanu': 'Manoj',
  'mahender bureddy': 'Mahendra',
  'gani siva ganesh asodi': 'Gani',
  'siva ganesh asodi': 'Gani',
  'raheel shaik': 'Raheel',
  'ravi kumar pattipati': 'Ravi',
  'yeshwanth kumar mutcherla': 'Yeswanth',
  'hemanth kasa': 'Hemanth',
  'karthik balakrishna': 'Karthik',
  'nikhil pasula': 'Nikhil',
  'saran damacharla': 'Saran',
  'suman reddy gaddam': 'Suman',
}

function findPlayer(name: string): string | null {
  const lower = name.toLowerCase().trim()
  // Direct match
  if (PLAYER_MAP[lower]) return PLAYER_MAP[lower]
  // Partial match
  for (const [key, val] of Object.entries(PLAYER_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return val
  }
  return null
}

function parseOvers(oversStr: string): number {
  const cleaned = oversStr.trim()
  if (!cleaned || cleaned === '0') return 0
  const parts = cleaned.split('.')
  if (parts.length === 1) return parseInt(parts[0]) || 0
  return parseFloat(cleaned) || 0
}

export function parseScorecardText(text: string): ParsedMatch {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const playerStats: Map<string, ParsedPlayerStats> = new Map()

  // Detect result
  let result: 'won' | 'lost' | 'tied' | 'no_result' = 'no_result'
  let mvcc_score = ''
  let opponent_score = ''

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes('mavericks cricket club mvcc') && lower.includes('won')) {
      result = 'won'
    } else if (lower.includes('won by') && !lower.includes('mvcc')) {
      result = 'lost'
    } else if (lower.includes('tied') || lower.includes('tie')) {
      result = 'tied'
    }

    // Extract scores - look for "182/7 (26.3 Overs)" pattern
    const scoreMatch = line.match(/Mavericks Cricket Club MVCC\s+(\d+\/\d+)\s*\(([^)]+)\)/i)
    if (scoreMatch) {
      mvcc_score = `${scoreMatch[1]} (${scoreMatch[2]})`
    }
    const oppMatch = line.match(/Michigan Rangers.*?(\d+\/\d+)\s*\(([^)]+)\)/i)
    if (oppMatch) {
      opponent_score = `${oppMatch[1]} (${oppMatch[2]})`
    }
  }

  // Parse batting section - MVCC batting
  // Format: "PlayerName ct/b/ro... Runs Balls Mins 4s 6s SR"
  let inMvccBatting = false
  let inMvccBowling = false
  let inOpponentBatting = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // Section detection
    if (lower.includes('mavericks cricket club mvcc - 1') || lower.includes('mavericks cricket club mvcc-1')) {
      inMvccBatting = true
      inMvccBowling = false
      inOpponentBatting = false
      continue
    }

    if (inMvccBatting && (lower.includes('s.no') && lower.includes('bowler'))) {
      inMvccBatting = false
      inMvccBowling = true
      continue
    }

    if (lower.includes('michigan rangers') && lower.includes('- 1')) {
      inMvccBowling = false
      inOpponentBatting = true
      continue
    }

    if (inOpponentBatting && lower.includes('s.no') && lower.includes('bowler')) {
      inOpponentBatting = false
      continue
    }

    // Parse MVCC batting line
    // Pattern: "1 Viswanath Kasu ct (Khalid S) Praveenkumar Reddy A 6 6 1 0 100.00"
    if (inMvccBatting && /^\d+\s+[A-Z]/.test(line)) {
      // Extract player name and stats
      // Remove leading number
      const withoutNum = line.replace(/^\d+\s+/, '')

      // Try to find numbers at end: Runs Balls Mins 4s 6s SR
      const numMatch = withoutNum.match(/(\d+)\s+(\d+)\s+\d*\s*(\d+)\s+(\d+)\s+[\d.]+\s*$/)
      if (numMatch) {
        const runs = parseInt(numMatch[1])
        const balls = parseInt(numMatch[2])
        const fours = parseInt(numMatch[3])
        const sixes = parseInt(numMatch[4])

        // Extract name - everything before the how-out info
        let nameSection = withoutNum
        // Remove the stats at end
        nameSection = nameSection.replace(/\d+\s+\d+\s+\d*\s*\d+\s+\d+\s+[\d.]+\s*$/, '').trim()
        // Remove dismissal info
        nameSection = nameSection.replace(/\s*(ct|ctw|b|lbw|ro|st|hit|retired|run out|not out|absent).*$/i, '').trim()

        const shortName = findPlayer(nameSection)
        if (shortName) {
          const existing = playerStats.get(shortName) || createEmpty(shortName, nameSection)
          existing.runs = runs
          existing.balls_faced = balls
          existing.fours = fours
          existing.sixes = sixes
          playerStats.set(shortName, existing)
        }
      }
    }

    // Parse MVCC bowling line
    // Pattern: "1 Rohith Maddipati 3.0 0 32 1 6 0 10.67"
    if (inMvccBowling && /^\d+\s+[A-Z]/.test(line)) {
      const withoutNum = line.replace(/^\d+\s+/, '')
      // Numbers at end: Overs Mdns Runs Wkts Wides NoBalls Ave
      const numMatch = withoutNum.match(/(\d+\.?\d*)\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+[\d.]+\s*$/)
      if (numMatch) {
        const overs = parseOvers(numMatch[1])
        const maidens = parseInt(numMatch[2])
        const runs = parseInt(numMatch[3])
        const wickets = parseInt(numMatch[4])

        let nameSection = withoutNum.replace(/[\d.]+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+[\d.]+\s*$/, '').trim()
        const shortName = findPlayer(nameSection)
        if (shortName) {
          const existing = playerStats.get(shortName) || createEmpty(shortName, nameSection)
          existing.overs_bowled = overs
          existing.maidens = maidens
          existing.runs_conceded = runs
          existing.wickets = wickets
          playerStats.set(shortName, existing)
        }
      }
    }

    // Parse catches from opponent batting - "ct (AKSHAY R) Rushi Vardan Reddy M"
    if (inOpponentBatting) {
      // Catch: ct (AKSHAY R)
      const catchMatch = line.match(/ct\s+\(([^)]+)\)/i)
      if (catchMatch) {
        const fielder = catchMatch[1]
        const shortName = findPlayer(fielder)
        if (shortName) {
          const existing = playerStats.get(shortName) || createEmpty(shortName, fielder)
          existing.catches += 1
          playerStats.set(shortName, existing)
        }
      }
      // Runout: ro (fielder)
      const roMatch = line.match(/ro\s+([A-Za-z\s]+?)(?:\s+\d|$)/i)
      if (roMatch) {
        const fielder = roMatch[1].trim()
        const shortName = findPlayer(fielder)
        if (shortName) {
          const existing = playerStats.get(shortName) || createEmpty(shortName, fielder)
          existing.runout_fielder += 1
          playerStats.set(shortName, existing)
        }
      }
      // Stumping: ctw (wicketkeeper)
      const stumpMatch = line.match(/ctw\s+\(([^)]+)\)/i)
      if (stumpMatch) {
        const keeper = stumpMatch[1]
        const shortName = findPlayer(keeper)
        if (shortName) {
          const existing = playerStats.get(shortName) || createEmpty(shortName, keeper)
          existing.stumpings += 1
          playerStats.set(shortName, existing)
        }
      }
    }
  }

  // Find POTM - highest scorer among MVCC players
  let potmPlayer = ''
  let maxRuns = 0
  for (const [name, stats] of playerStats.entries()) {
    if (stats.runs > maxRuns) {
      maxRuns = stats.runs
      potmPlayer = name
    }
  }
  if (potmPlayer && maxRuns >= 30) {
    const p = playerStats.get(potmPlayer)!
    p.is_potm = true
    playerStats.set(potmPlayer, p)
  }

  return {
    result,
    mvcc_score,
    opponent_score,
    players: Array.from(playerStats.values()),
  }
}

function createEmpty(shortName: string, fullName: string): ParsedPlayerStats {
  return {
    name: fullName,
    short_name: shortName,
    runs: 0,
    balls_faced: 0,
    fours: 0,
    sixes: 0,
    overs_bowled: 0,
    runs_conceded: 0,
    wickets: 0,
    maidens: 0,
    catches: 0,
    runout_fielder: 0,
    runout_helper: 0,
    stumpings: 0,
    is_potm: false,
  }
}
