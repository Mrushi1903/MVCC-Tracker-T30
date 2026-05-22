// CSV Scorecard Parser for CricClub exports
// POTM is NEVER auto-assigned — must be set manually in admin

export interface ParsedPlayerStats {
  short_name: string
  full_name: string
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

export interface ParsedOpponentBatsman {
  player_name: string
  runs: number
  balls: number
  fours: number
  sixes: number
  how_out: string
}

export interface ParsedOpponentBowler {
  player_name: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
}

export interface ParsedMatch {
  result: 'won' | 'lost' | 'tied' | 'no_result'
  mvcc_score: string
  opponent_score: string
  opponent_name: string        // extracted from CSV line 1
  players: ParsedPlayerStats[]
  opponent_batting: ParsedOpponentBatsman[]
  opponent_bowling: ParsedOpponentBowler[]
}

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
  if (PLAYER_MAP[lower]) return PLAYER_MAP[lower]
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
    short_name: shortName, full_name: fullName,
    runs: 0, balls_faced: 0, fours: 0, sixes: 0,
    overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0,
    catches: 0, runout_fielder: 0, runout_helper: 0, stumpings: 0,
    is_potm: false,
  }
}

// Extract opponent name from CSV line 1
// e.g. "T30: League Michigan Rangers CC MIRC won by 8 Wickets..."
// returns "Michigan Rangers CC"
function extractOpponentName(firstLine: string): string {
  // Try to find opponent from "Mavericks Cricket Club MVCC Vs OPPONENT" pattern
  const vsMatch = firstLine.match(/MVCC\s+Vs\s+(.+?)(?:\s+[A-Z]{2,4}\s|$)/i)
  if (vsMatch) return vsMatch[1].trim()

  // Fallback — look for pattern before "won by"
  const wonMatch = firstLine.match(/^T30.*?League\s+(.+?)\s+(?:[A-Z]{2,5}\s+)?won\s+by/i)
  if (wonMatch) return wonMatch[1].trim()

  return 'Opponent'
}

export function parseCricClubCSV(csvText: string): ParsedMatch {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)

  const playerMap        = new Map<string, ParsedPlayerStats>()
  const opponentBatting: ParsedOpponentBatsman[] = []
  const opponentBowling: ParsedOpponentBowler[]  = []

  let result: 'won' | 'lost' | 'tied' | 'no_result' = 'no_result'
  let mvcc_score     = ''
  let opponent_score = ''
  let opponent_name  = 'Opponent'

  // ── LINE 1: result + opponent name ───────────────────────
  if (lines.length > 0) {
    const firstLine = lines[0]
    const lower0    = firstLine.toLowerCase()
    if (lower0.includes('mvcc won'))  result = 'won'
    else if (lower0.includes('won by')) result = 'lost'
    else if (lower0.includes('tied'))   result = 'tied'
    opponent_name = extractOpponentName(firstLine)
  }

  // ── LINE 2: "MVCC Vs OPPONENT" — better opponent name ────
  if (lines.length > 1) {
    const vsLine = lines[1]
    const vsMatch = vsLine.match(/MVCC\s+Vs\s+(.+?)(?:\s+[A-Z]{2,5})?$/i)
    if (vsMatch) {
      // Strip trailing acronym (e.g. "MIRC")
      opponent_name = vsMatch[1].replace(/\s+[A-Z]{2,5}$/, '').trim()
    }
  }

  type Section = 'none' | 'mvcc_batting' | 'opp_bowling' | 'opp_batting' | 'mvcc_bowling'
  let section: Section = 'none'

  for (let i = 0; i < lines.length; i++) {
    const line  = lines[i]
    const lower = line.toLowerCase()

    // ── Section detection (dynamic — not hardcoded to opponent name) ──
    if (lower.includes('mavericks cricket club') && lower.includes('batting')) {
      section = 'mvcc_batting'; continue
    }
    if (lower.includes('mavericks cricket club') && lower.includes('bowling')) {
      section = 'mvcc_bowling'; continue
    }
    // Opponent sections — anything that's NOT mavericks + batting/bowling
    if (!lower.includes('mavericks') && lower.includes('batting') && lower.includes('cc')) {
      section = 'opp_batting'; continue
    }
    if (!lower.includes('mavericks') && lower.includes('bowling') && lower.includes('cc')) {
      section = 'opp_bowling'; continue
    }

    // Skip header rows
    if (lower.startsWith('batsman') || lower.startsWith('bowler,overs') || lower.startsWith('s.no')) continue

    // ── MVCC BATTING ──────────────────────────────────────
    if (section === 'mvcc_batting') {
      if (lower.includes('byes:')) {
        const parts = line.split(',').map(p => p.trim())
        const runs  = parts[parts.length - 2]
        const overs = parts[parts.length - 1]
        if (runs && overs && !isNaN(Number(runs))) {
          const wkts = line.match(/wickets\s*:\s*(\d+)/i)?.[1] ?? '10'
          mvcc_score = `${runs}/${wkts} (${overs} Overs)`
        }
        continue
      }
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 6) continue
      const fullName  = parts[0].replace(/^\t/, '').trim()
      const shortName = findShortName(fullName)
      if (!shortName) continue
      const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
      player.runs        = parseInt(parts[4]) || 0
      player.balls_faced = parseInt(parts[5]) || 0
      player.fours       = parseInt(parts[6]) || 0
      player.sixes       = parseInt(parts[7]) || 0
      playerMap.set(shortName, player)
    }

    // ── OPPONENT BATTING ──────────────────────────────────
    if (section === 'opp_batting') {
      if (lower.includes('byes:')) {
        const parts = line.split(',').map(p => p.trim())
        const runs  = parts[parts.length - 2]
        const overs = parts[parts.length - 1]
        if (runs && overs && !isNaN(Number(runs))) {
          const wkts = line.match(/wickets\s*:\s*(\d+)/i)?.[1] ?? '10'
          opponent_score = `${runs}/${wkts} (${overs} Overs)`
        }
        continue
      }
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 3) continue

      const playerName = parts[0].replace(/^\t/, '').trim()
      const howOut     = parts[1]?.toLowerCase().trim() || ''
      const fielderRaw = parts[2]?.trim() || ''

      // Save opponent batsman stats
      if (playerName && parts.length >= 8) {
        opponentBatting.push({
          player_name: playerName,
          how_out:     howOut,
          runs:        parseInt(parts[4]) || 0,
          balls:       parseInt(parts[5]) || 0,
          fours:       parseInt(parts[6]) || 0,
          sixes:       parseInt(parts[7]) || 0,
        })
      }

      // Also extract MVCC fielding credits
      if (howOut === 'ct' && fielderRaw) {
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          p.catches += 1
          playerMap.set(short, p)
        }
      }
      if (howOut === 'ctw' && fielderRaw) {
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          p.stumpings += 1
          playerMap.set(short, p)
        }
      }
      if ((howOut === 'ro' || howOut === 'run out') && fielderRaw) {
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          p.runout_fielder += 1
          playerMap.set(short, p)
        }
        const helperRaw   = parts[3]?.trim() || ''
        if (helperRaw) {
          const helperShort = findShortName(helperRaw)
          if (helperShort && helperShort !== findShortName(fielderRaw)) {
            const ph = playerMap.get(helperShort) || createEmptyPlayer(helperShort, helperRaw)
            ph.runout_helper += 1
            playerMap.set(helperShort, ph)
          }
        }
      }
    }

    // ── OPPONENT BOWLING ──────────────────────────────────
    if (section === 'opp_bowling') {
      if (lower.startsWith('total') || lower.startsWith('extras')) continue
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 5) continue
      const playerName = parts[0].replace(/^\t/, '').trim()
      if (!playerName) continue
      opponentBowling.push({
        player_name:   playerName,
        overs:         parseOvers(parts[1]),
        maidens:       parseInt(parts[2]) || 0,
        runs_conceded: parseInt(parts[3]) || 0,
        wickets:       parseInt(parts[4]) || 0,
      })
    }

    // ── MVCC BOWLING ──────────────────────────────────────
    if (section === 'mvcc_bowling') {
      if (lower.startsWith('total') || lower.startsWith('extras')) continue
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 5) continue
      const fullName  = parts[0].replace(/^\t/, '').trim()
      const shortName = findShortName(fullName)
      if (!shortName) continue
      const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
      player.overs_bowled  = parseOvers(parts[1])
      player.maidens       = parseInt(parts[2]) || 0
      player.runs_conceded = parseInt(parts[3]) || 0
      player.wickets       = parseInt(parts[4]) || 0
      playerMap.set(shortName, player)
    }
  }

  return {
    result,
    mvcc_score,
    opponent_score,
    opponent_name,
    players:          Array.from(playerMap.values()),
    opponent_batting: opponentBatting,
    opponent_bowling: opponentBowling,
  }
}
