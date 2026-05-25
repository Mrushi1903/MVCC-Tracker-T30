// CSV Scorecard Parser for CricClub exports.
// POTM is NEVER auto-assigned — must be set manually in admin.

export interface ParsedPlayerStats {
  short_name: string
  full_name: string
  // Batting
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  how_out: string | null     // raw code: ct / ctw / b / ro / lbw / st / '' / 'not out'
  fielder: string | null     // dismissal fielder (raw name from CSV)
  bowler_name: string | null // dismissal bowler (raw name from CSV)
  // Bowling
  overs_bowled: number
  runs_conceded: number
  wickets: number
  maidens: number
  wides: number
  no_balls: number
  dot_balls: number
  // Fielding
  catches: number
  runout_fielder: number
  runout_helper: number
  stumpings: number
  // Awards
  is_potm: boolean
}

export interface ParsedOpponentBatsman {
  player_name: string
  runs: number
  balls: number
  fours: number
  sixes: number
  how_out: string
  fielder: string | null
  bowler_name: string | null
}

export interface ParsedOpponentBowler {
  player_name: string
  overs: number
  maidens: number
  runs_conceded: number
  wickets: number
  wides: number
  no_balls: number
  dot_balls: number
}

export interface ParsedExtras {
  byes: number
  leg_byes: number
  wides: number
  no_balls: number
  penalty: number
  total_extras: number
}

export interface ParsedFow {
  wicket_number: number
  score: number
  over_number: string
  batsman_name: string
}

export interface ParsedMatch {
  result: 'won' | 'lost' | 'tied' | 'no_result'
  mvcc_score: string
  opponent_score: string
  opponent_name: string
  players: ParsedPlayerStats[]
  opponent_batting: ParsedOpponentBatsman[]
  opponent_bowling: ParsedOpponentBowler[]
  mvcc_extras: ParsedExtras
  opponent_extras: ParsedExtras
  mvcc_fow: ParsedFow[]
  opponent_fow: ParsedFow[]
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
  return parseFloat((s ?? '').trim() || '0') || 0
}

function emptyExtras(): ParsedExtras {
  return { byes: 0, leg_byes: 0, wides: 0, no_balls: 0, penalty: 0, total_extras: 0 }
}

function createEmptyPlayer(shortName: string, fullName: string): ParsedPlayerStats {
  return {
    short_name: shortName, full_name: fullName,
    runs: 0, balls_faced: 0, fours: 0, sixes: 0,
    how_out: null, fielder: null, bowler_name: null,
    overs_bowled: 0, runs_conceded: 0, wickets: 0, maidens: 0,
    wides: 0, no_balls: 0, dot_balls: 0,
    catches: 0, runout_fielder: 0, runout_helper: 0, stumpings: 0,
    is_potm: false,
  }
}

// CricClub extras line looks like:
//   "Byes: 1,Leg Byes: 0,Wickets: 7,Wides: 16,No Balls: 1,Penalty: 0,182,26.3"
// We pull out each labelled field with a regex and use the trailing two
// fields (total runs, overs) to build the "score" string.
function parseExtrasLine(line: string): { extras: ParsedExtras; totalRuns: string; overs: string; wickets: string } {
  const extras = emptyExtras()
  const grab = (label: string): number => {
    const m = line.match(new RegExp(label + '\\s*:\\s*(\\d+)', 'i'))
    return m ? parseInt(m[1]) || 0 : 0
  }
  extras.byes     = grab('byes')
  extras.leg_byes = grab('leg\\s*byes')
  extras.wides    = grab('wides')
  extras.no_balls = grab('no\\s*balls')
  extras.penalty  = grab('penalty')
  extras.total_extras = extras.byes + extras.leg_byes + extras.wides + extras.no_balls + extras.penalty

  const wickets = line.match(/wickets\s*:\s*(\d+)/i)?.[1] ?? '10'
  // Last two comma-separated chunks are total runs + overs.
  const parts = line.split(',').map(p => p.trim())
  const totalRuns = parts[parts.length - 2] ?? ''
  const overs = parts[parts.length - 1] ?? ''
  return { extras, totalRuns, overs, wickets }
}

// FOW row: "Viswanath Kasu,11-1,Over 1.6"   →   wicket 1 at score 11, over 1.6, batsman Viswa
function parseFowRow(line: string): ParsedFow | null {
  const parts = line.split(',').map(p => p.trim())
  if (parts.length < 3) return null
  const batsman = parts[0]
  const scoreWkt = parts[1] // "11-1" or "1-11"; CricClub uses "score-wicket"
  const overStr  = parts[2].replace(/^over\s*/i, '').trim()
  const swMatch  = scoreWkt.match(/(\d+)\s*-\s*(\d+)/)
  if (!swMatch) return null
  const score = parseInt(swMatch[1])
  const wicketNumber = parseInt(swMatch[2])
  if (isNaN(score) || isNaN(wicketNumber)) return null
  return {
    wicket_number: wicketNumber,
    score,
    over_number: overStr,
    batsman_name: batsman,
  }
}

function extractOpponentName(firstLine: string): string {
  const vsMatch = firstLine.match(/MVCC\s+Vs\s+(.+?)(?:\s+[A-Z]{2,4}\s|$)/i)
  if (vsMatch) return vsMatch[1].trim()
  const wonMatch = firstLine.match(/^T30.*?League\s+(.+?)\s+(?:[A-Z]{2,5}\s+)?won\s+by/i)
  if (wonMatch) return wonMatch[1].trim()
  return 'Opponent'
}

export function parseCricClubCSV(csvText: string): ParsedMatch {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)

  const playerMap        = new Map<string, ParsedPlayerStats>()
  const opponentBatting: ParsedOpponentBatsman[] = []
  const opponentBowling: ParsedOpponentBowler[]  = []
  const mvccFow: ParsedFow[]     = []
  const opponentFow: ParsedFow[] = []
  let mvccExtras: ParsedExtras     = emptyExtras()
  let opponentExtras: ParsedExtras = emptyExtras()

  let result: 'won' | 'lost' | 'tied' | 'no_result' = 'no_result'
  let mvcc_score     = ''
  let opponent_score = ''
  let opponent_name  = 'Opponent'

  if (lines.length > 0) {
    const firstLine = lines[0]
    const lower0    = firstLine.toLowerCase()
    if (lower0.includes('mvcc won'))      result = 'won'
    else if (lower0.includes('won by'))   result = 'lost'
    else if (lower0.includes('tied'))     result = 'tied'
    opponent_name = extractOpponentName(firstLine)
  }
  if (lines.length > 1) {
    const vsLine = lines[1]
    const vsMatch = vsLine.match(/MVCC\s+Vs\s+(.+?)(?:\s+[A-Z]{2,5})?$/i)
    if (vsMatch) opponent_name = vsMatch[1].replace(/\s+[A-Z]{2,5}$/, '').trim()
  }

  // FOW sections in CricClub typically follow "Fall of Wickets" header. We attach the
  // FOW rows to the most recently seen batting section.
  type Section = 'none' | 'mvcc_batting' | 'opp_bowling' | 'opp_batting' | 'mvcc_bowling' | 'mvcc_fow' | 'opp_fow'
  let section: Section = 'none'
  // Track which batting innings the next FOW block belongs to.
  let lastBattingSide: 'mvcc' | 'opponent' | null = null

  for (let i = 0; i < lines.length; i++) {
    const line  = lines[i]
    const lower = line.toLowerCase()

    // Section headers
    if (lower.includes('mavericks cricket club') && lower.includes('batting')) {
      section = 'mvcc_batting'; lastBattingSide = 'mvcc'; continue
    }
    if (lower.includes('mavericks cricket club') && lower.includes('bowling')) {
      section = 'mvcc_bowling'; continue
    }
    if (!lower.includes('mavericks') && lower.includes('batting') && lower.includes('cc')) {
      section = 'opp_batting'; lastBattingSide = 'opponent'; continue
    }
    if (!lower.includes('mavericks') && lower.includes('bowling') && lower.includes('cc')) {
      section = 'opp_bowling'; continue
    }
    if (lower.startsWith('fall of wickets') || lower === 'fall of wickets,') {
      section = lastBattingSide === 'opponent' ? 'opp_fow' : 'mvcc_fow'
      continue
    }

    // Skip table header rows
    if (lower.startsWith('batsman') || lower.startsWith('bowler,overs') || lower.startsWith('s.no') || lower.startsWith('player name')) continue

    // ── MVCC BATTING ──────────────────────────────────────
    if (section === 'mvcc_batting') {
      if (lower.includes('byes:')) {
        const { extras, totalRuns, overs, wickets } = parseExtrasLine(line)
        mvccExtras = extras
        if (totalRuns && overs && !isNaN(Number(totalRuns))) {
          mvcc_score = `${totalRuns}/${wickets} (${overs} Overs)`
        }
        continue
      }
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 6) continue
      const fullName  = parts[0].replace(/^\t/, '').trim()
      const shortName = findShortName(fullName)
      if (!shortName) continue
      const player = playerMap.get(shortName) || createEmptyPlayer(shortName, fullName)
      player.how_out     = (parts[1] || '').toLowerCase() || 'not out'
      player.fielder     = parts[2] || null
      player.bowler_name = parts[3] || null
      player.runs        = parseInt(parts[4]) || 0
      player.balls_faced = parseInt(parts[5]) || 0
      player.fours       = parseInt(parts[6]) || 0
      player.sixes       = parseInt(parts[7]) || 0
      playerMap.set(shortName, player)
    }

    // ── OPPONENT BATTING ──────────────────────────────────
    if (section === 'opp_batting') {
      if (lower.includes('byes:')) {
        const { extras, totalRuns, overs, wickets } = parseExtrasLine(line)
        opponentExtras = extras
        if (totalRuns && overs && !isNaN(Number(totalRuns))) {
          opponent_score = `${totalRuns}/${wickets} (${overs} Overs)`
        }
        continue
      }
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 3) continue

      const playerName = parts[0].replace(/^\t/, '').trim()
      const howOut     = (parts[1] || '').toLowerCase().trim()
      const fielderRaw = parts[2]?.trim() || ''
      const bowlerRaw  = parts[3]?.trim() || ''

      if (playerName && parts.length >= 8) {
        opponentBatting.push({
          player_name: playerName,
          how_out:     howOut,
          fielder:     fielderRaw || null,
          bowler_name: bowlerRaw  || null,
          runs:        parseInt(parts[4]) || 0,
          balls:       parseInt(parts[5]) || 0,
          fours:       parseInt(parts[6]) || 0,
          sixes:       parseInt(parts[7]) || 0,
        })
      }

      // MVCC fielding credits from opponent dismissals
      if (howOut === 'ct' && fielderRaw) {
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          p.catches += 1
          playerMap.set(short, p)
        }
      }
      if ((howOut === 'ctw' || howOut === 'st') && fielderRaw) {
        const short = findShortName(fielderRaw)
        if (short) {
          const p = playerMap.get(short) || createEmptyPlayer(short, fielderRaw)
          if (howOut === 'st') p.stumpings += 1
          else p.stumpings += 1 // ctw = caught behind by keeper — treat as stumping credit
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

    // ── OPPONENT BOWLING ──────────────────────────────────
    if (section === 'opp_bowling') {
      if (lower.startsWith('total') || lower.startsWith('extras')) continue
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 5) continue
      const playerName = parts[0].replace(/^\t/, '').trim()
      if (!playerName) continue
      // CricClub bowling columns: Bowler, Overs, Maidens, Runs, Wickets, Wides, No Balls, Hattricks, Dot Balls
      opponentBowling.push({
        player_name:   playerName,
        overs:         parseOvers(parts[1]),
        maidens:       parseInt(parts[2]) || 0,
        runs_conceded: parseInt(parts[3]) || 0,
        wickets:       parseInt(parts[4]) || 0,
        wides:         parseInt(parts[5]) || 0,
        no_balls:      parseInt(parts[6]) || 0,
        dot_balls:     parseInt(parts[8]) || 0,
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
      player.wides         = parseInt(parts[5]) || 0
      player.no_balls      = parseInt(parts[6]) || 0
      player.dot_balls     = parseInt(parts[8]) || 0
      playerMap.set(shortName, player)
    }

    // ── FALL OF WICKETS ───────────────────────────────────
    if (section === 'mvcc_fow' || section === 'opp_fow') {
      const fow = parseFowRow(line)
      if (!fow) continue
      if (section === 'mvcc_fow') mvccFow.push(fow)
      else opponentFow.push(fow)
    }
  }

  // Sort FOW by wicket number ascending for clean rendering.
  mvccFow.sort((a, b) => a.wicket_number - b.wicket_number)
  opponentFow.sort((a, b) => a.wicket_number - b.wicket_number)

  return {
    result,
    mvcc_score,
    opponent_score,
    opponent_name,
    players:          Array.from(playerMap.values()),
    opponent_batting: opponentBatting,
    opponent_bowling: opponentBowling,
    mvcc_extras:      mvccExtras,
    opponent_extras:  opponentExtras,
    mvcc_fow:         mvccFow,
    opponent_fow:     opponentFow,
  }
}

// Format a raw dismissal code into Cricbuzz-style display text.
// Reused by both admin preview and scorecard rendering.
export function formatDismissal(howOut: string | null | undefined, fielder?: string | null, bowler?: string | null): string {
  const code = (howOut ?? '').toLowerCase().trim()
  if (!code || code === 'not out') return 'not out'
  switch (code) {
    case 'ct':  return `c ${fielder || '?'} b ${bowler || '?'}`
    case 'ctw': return `c †${fielder || '?'} b ${bowler || '?'}`
    case 'b':   return `b ${bowler || '?'}`
    case 'ro':
    case 'run out': return `run out (${fielder || '?'})`
    case 'lbw': return `lbw b ${bowler || '?'}`
    case 'st':  return `st †${fielder || '?'} b ${bowler || '?'}`
    default:    return code
  }
}
