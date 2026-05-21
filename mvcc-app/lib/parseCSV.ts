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

export interface ParsedMatch {
  result: 'won' | 'lost' | 'tied' | 'no_result'
  mvcc_score: string
  opponent_score: string
  players: ParsedPlayerStats[]
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
    short_name: shortName,
    full_name: fullName,
    runs: 0, balls_faced: 0, fours: 0, sixes: 0,
    overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0,
    catches: 0, runout_fielder: 0, runout_helper: 0, stumpings: 0,
    is_potm: false, // ALWAYS false — admin assigns manually
  }
}

export function parseCricClubCSV(csvText: string): ParsedMatch {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)

  const playerMap = new Map<string, ParsedPlayerStats>()

  let result: 'won' | 'lost' | 'tied' | 'no_result' = 'no_result'
  let mvcc_score = ''
  let opponent_score = ''

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('mvcc won')) { result = 'won'; break }
    else if (lower.includes('won by')) { result = 'lost'; break }
    else if (lower.includes('tied')) { result = 'tied'; break }
  }

  type Section = 'none' | 'mvcc_batting' | 'opp_bowling' | 'opp_batting' | 'mvcc_bowling'
  let section: Section = 'none'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

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

    if (lower.startsWith('batsman') || lower.startsWith('bowler,overs') || lower.startsWith('s.no')) continue

    if (section === 'mvcc_batting') {
      if (lower.includes('byes:')) {
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
      const fullName = parts[0].replace(/^\t/, '').trim()
      const shortName = findShortName(fullName)
      if (!shortName) continue
      const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
      player.runs = parseInt(parts[4]) || 0
      player.balls_faced = parseInt(parts[5]) || 0
      player.fours = parseInt(parts[6]) || 0
      player.sixes = parseInt(parts[7]) || 0
      playerMap.set(shortName, player)
    }

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
      const howOut = parts[1]?.toLowerCase().trim() || ''
      const fielderRaw = parts[2]?.trim() || ''

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
        const helperRaw = parts[3]?.trim() || ''
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

    if (section === 'mvcc_bowling') {
      if (lower.startsWith('total') || lower.startsWith('extras')) continue
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 5) continue
      const fullName = parts[0].replace(/^\t/, '').trim()
      const shortName = findShortName(fullName)
      if (!shortName) continue
      const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
      player.overs_bowled = parseOvers(parts[1])
      player.maidens = parseInt(parts[2]) || 0
      player.runs_conceded = parseInt(parts[3]) || 0
      player.wickets = parseInt(parts[4]) || 0
      playerMap.set(shortName, player)
    }
  }

  // ✅ NO AUTO-POTM — is_potm stays false for all players
  // Admin manually assigns POTM in the admin panel after checking official result

  return {
    result,
    mvcc_score,
    opponent_score,
    players: Array.from(playerMap.values()),
  }
}