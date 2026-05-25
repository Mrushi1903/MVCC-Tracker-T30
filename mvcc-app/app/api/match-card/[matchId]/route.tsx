// MVCC match summary card — 1080×1080 PNG.
// Uses the Edge runtime + @vercel/og's ImageResponse (re-exported by next/og).
// Layout: MCA-style — header / MVCC innings block / Opponent innings block / result banner.

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { getOpponentLogo, getOpponentInitials } from '@/lib/opponentLogos'

export const runtime = 'edge'

// Reliable font URLs from @fontsource on jsdelivr — these always resolve,
// unlike the gstatic URLs which carry rotating hashes.
const INTER_REG_URL   = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-400-normal.woff'
const INTER_BOLD_URL  = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-700-normal.woff'
const INTER_BLACK_URL = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-900-normal.woff'

async function loadFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

type MatchRow = {
  id: number
  match_number: number
  date: string
  opponent: string
  opponent_short: string | null
  ground: string
  result: 'won' | 'lost' | 'tied' | 'no_result' | null
  mvcc_score: string | null
  opponent_score: string | null
  potm_player_id: number | null
}
type PerfRow = {
  player_id: number
  runs: number
  balls_faced: number
  overs_bowled: number
  runs_conceded: number
  wickets: number
}
type OppBat = { player_name: string; runs: number; balls: number }
type OppBow = { player_name: string; wickets: number; runs_conceded: number; overs: number }
type PlayerRow = { id: number; short_name: string; name: string }

const COL_TEAM_MM   = '#F0B95B' // a touch warmer than --mm so it pops on dark
const COL_TEAM_OPP  = '#38bdf8'
const COL_WICKET    = '#4ade80'
const COL_MUTED     = '#6b7a8f'
const COL_BG_TOP    = '#0a1628'
const COL_BG_BOT    = '#050d1a'
const COL_MVCC_BAND = '#1a2540'
const COL_OPP_BAND  = '#0f1d30'

function shortFullName(name: string): string {
  // "Amarendra Nuvvala" → "AMARENDRA N"; single token returned as-is.
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].toUpperCase()
  return `${parts[0].toUpperCase()} ${parts[parts.length - 1][0].toUpperCase()}`
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

function fmtOvers(o: number): string {
  const f = Math.floor(o)
  const b = Math.round((o - f) * 10)
  return b > 0 ? `${f}.${b}` : `${f}.0`
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ matchId: string }> },
) {
  try {
    return await renderCard(req, ctx)
  } catch (err) {
    console.error('[match-card] render failed', err)
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg, stack: err instanceof Error ? err.stack : undefined }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}

async function renderCard(req: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const url = new URL(req.url)
  const diag = url.searchParams.get('diag') === '1'

  const { matchId } = await ctx.params
  const id = parseInt(matchId)
  if (!id || isNaN(id)) {
    return new Response('Bad match id', { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Fetch in parallel.
  const [matchRes, perfsRes, oppBatRes, oppBowRes, playersRes] = await Promise.all([
    supabase.from('matches').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('performances')
      .select('player_id, runs, balls_faced, overs_bowled, runs_conceded, wickets')
      .eq('match_id', id),
    supabase
      .from('opponent_batting')
      .select('player_name, runs, balls')
      .eq('match_id', id),
    supabase
      .from('opponent_bowling')
      .select('player_name, wickets, runs_conceded, overs')
      .eq('match_id', id),
    supabase.from('players').select('id, short_name, name'),
  ])

  const match = (matchRes.data as MatchRow | null) ?? null
  if (!match) return new Response('Match not found', { status: 404 })

  const perfs   = (perfsRes.data as PerfRow[] | null) ?? []
  const oppBat  = (oppBatRes.data as OppBat[] | null) ?? []
  const oppBow  = (oppBowRes.data as OppBow[] | null) ?? []
  const players = (playersRes.data as PlayerRow[] | null) ?? []
  const playerById = new Map<number, PlayerRow>()
  for (const p of players) playerById.set(p.id, p)

  // ── Derived top-3 lists ─────────────────────────────────────
  const mvccBatters = perfs
    .filter(p => p.runs > 0 || p.balls_faced > 0)
    .sort((a, b) => b.runs - a.runs || b.balls_faced - a.balls_faced)
    .slice(0, 3)

  const mvccBowlers = perfs
    .filter(p => p.overs_bowled > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runs_conceded - b.runs_conceded)
    .slice(0, 3)

  const oppBatters = [...oppBat]
    .sort((a, b) => b.runs - a.runs || b.balls - a.balls)
    .slice(0, 3)

  const oppBowlers = [...oppBow]
    .sort((a, b) => b.wickets - a.wickets || a.runs_conceded - b.runs_conceded)
    .slice(0, 3)

  const potmPlayer = match.potm_player_id ? playerById.get(match.potm_player_id) : null

  // ── DIAG MODE — return JSON to confirm Supabase data is reaching us ──
  if (diag) {
    return new Response(JSON.stringify({
      match,
      mvccBatters: mvccBatters.map(b => ({ ...b, name: playerById.get(b.player_id)?.short_name })),
      mvccBowlers: mvccBowlers.map(b => ({ ...b, name: playerById.get(b.player_id)?.short_name })),
      oppBatters,
      oppBowlers,
      potm: potmPlayer?.short_name,
      logos: {
        mvcc: '/mavericks-logo.jpeg',
        opponent: getOpponentLogo(match.opponent),
      },
    }, null, 2), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  // ── Fonts ───────────────────────────────────────────────────
  // If any font fetch fails, we still render — next/og falls back to a system font.
  const [interBold, interBlack, interReg] = await Promise.all([
    loadFont(INTER_BOLD_URL),
    loadFont(INTER_BLACK_URL),
    loadFont(INTER_REG_URL),
  ])
  type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  const fonts: Array<{ name: string; data: ArrayBuffer; weight: FontWeight; style: 'normal' }> = []
  if (interReg)   fonts.push({ name: 'Inter',      data: interReg,   weight: 400, style: 'normal' })
  if (interBold)  fonts.push({ name: 'Inter',      data: interBold,  weight: 700, style: 'normal' })
  if (interBlack) fonts.push({ name: 'InterBlack', data: interBlack, weight: 900, style: 'normal' })

  // ── Date string ─────────────────────────────────────────────
  const [y, mo, d] = (match.date ?? '').split('-').map(Number)
  const dateStr = !isNaN(y) ? new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  // Logos are kept in `getOpponentLogo` for future use, but the rendered card
  // currently shows initials-only badges to avoid Edge-runtime image fetches.
  const opponentInitials = getOpponentInitials(match.opponent)

  // ── Result banner ───────────────────────────────────────────
  const won  = match.result === 'won'
  const lost = match.result === 'lost'
  const tied = match.result === 'tied'

  const resultBg     = won ? '#0a2a0a' : lost ? '#2a0a0a' : tied ? '#2a200a' : '#15203a'
  const resultBorder = won ? COL_WICKET : lost ? '#f43f5e' : tied ? '#F59E0B' : '#475569'
  const resultText   = won
    ? `MVCC WON`
    : lost
      ? `${(match.opponent_short || match.opponent).toUpperCase()} WON`
      : tied
        ? 'MATCH TIED'
        : (match.result === 'no_result' ? 'NO RESULT' : 'MATCH PLAYED')

  // ── JSX tree ────────────────────────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(180deg, ${COL_BG_TOP} 0%, ${COL_BG_BOT} 100%)`,
          fontFamily: '"Inter"',
          color: 'white',
        }}
      >
        {/* ── HEADER ───────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: '32px 48px 18px',
            borderBottom: '2px solid rgba(240,185,91,0.45)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: '"InterBlack"', fontSize: 42, lineHeight: 1, letterSpacing: 1.2 }}>
              MAVERICKS CRICKET CLUB
            </div>
            <div style={{ fontSize: 22, color: COL_TEAM_MM, marginTop: 8, letterSpacing: 2.5, fontWeight: 700 }}>
              2026 T30 · INTERNAL TOURNAMENT
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1.5 }}>
              MATCH {match.match_number}
            </div>
            <div style={{ fontSize: 18, color: COL_MUTED, marginTop: 6, letterSpacing: 1 }}>
              {dateStr.toUpperCase()}{match.ground ? ` · ${match.ground.toUpperCase()}` : ''}
            </div>
          </div>
        </div>

        {/* ── MVCC INNINGS BLOCK ───────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: COL_MVCC_BAND, padding: '20px 48px 22px' }}>
          {/* Team row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(240,185,91,0.15)',
                border: `2px solid ${COL_TEAM_MM}`,
                color: COL_TEAM_MM,
                fontSize: 24, fontWeight: 700, letterSpacing: 1,
              }}>
                MV
              </div>
              <div style={{ marginLeft: 18, display: 'flex', alignItems: 'baseline' }}>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1, color: 'white' }}>MAVERICKS CC</div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, color: COL_MUTED, marginLeft: 10 }}>MVCC</div>
              </div>
            </div>
            <div style={{ display: 'flex', fontFamily: '"InterBlack"', fontSize: 56, color: COL_TEAM_MM, letterSpacing: 1 }}>
              {match.mvcc_score || '—'}
            </div>
          </div>

          {/* Two-column data */}
          <DataColumns
            leftLabel="BATSMAN"
            leftRight1Label="R"
            leftRight2Label="B"
            leftRows={mvccBatters.map(b => {
              const pl = playerById.get(b.player_id)
              return {
                name: pl ? shortFullName(pl.name) : '—',
                v1: String(b.runs),
                v1Color: COL_TEAM_MM,
                v2: String(b.balls_faced),
              }
            })}
            rightLabel="BOWLER"
            rightRight1Label="W-R"
            rightRight2Label="O"
            rightRows={oppBowlers.map(b => ({
              name: shortFullName(b.player_name),
              v1: `${b.wickets}-${b.runs_conceded}`,
              v1Color: b.wickets > 0 ? COL_WICKET : COL_MUTED,
              v2: fmtOvers(b.overs),
            }))}
          />
        </div>

        {/* ── OPPONENT INNINGS BLOCK ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: COL_OPP_BAND, padding: '20px 48px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(56,189,248,0.15)',
                border: `2px solid ${COL_TEAM_OPP}`,
                color: COL_TEAM_OPP,
                fontSize: 24, fontWeight: 700, letterSpacing: 1,
              }}>
                {opponentInitials}
              </div>
              <div style={{ display: 'flex', marginLeft: 18, fontSize: 32, fontWeight: 700, letterSpacing: 1, color: 'white' }}>
                {truncate((match.opponent || 'OPPONENT').toUpperCase(), 32)}
              </div>
            </div>
            <div style={{ display: 'flex', fontFamily: '"InterBlack"', fontSize: 56, color: COL_TEAM_OPP, letterSpacing: 1 }}>
              {match.opponent_score || '—'}
            </div>
          </div>

          <DataColumns
            leftLabel="BATSMAN"
            leftRight1Label="R"
            leftRight2Label="B"
            leftRows={oppBatters.length > 0
              ? oppBatters.map(b => ({
                  name: shortFullName(b.player_name),
                  v1: String(b.runs),
                  v1Color: COL_TEAM_OPP,
                  v2: String(b.balls),
                }))
              : [{ name: 'DATA NOT AVAILABLE', v1: '—', v1Color: COL_MUTED, v2: '—' }]}
            rightLabel="BOWLER"
            rightRight1Label="W-R"
            rightRight2Label="O"
            rightRows={mvccBowlers.length > 0
              ? mvccBowlers.map(b => {
                  const pl = playerById.get(b.player_id)
                  return {
                    name: pl ? shortFullName(pl.name) : '—',
                    v1: `${b.wickets}-${b.runs_conceded}`,
                    v1Color: b.wickets > 0 ? COL_WICKET : COL_MUTED,
                    v2: fmtOvers(b.overs_bowled),
                  }
                })
              : [{ name: 'DATA NOT AVAILABLE', v1: '—', v1Color: COL_MUTED, v2: '—' }]}
          />
        </div>

        {/* ── RESULT BANNER ────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: resultBg,
            borderTop: `3px solid ${resultBorder}`,
            padding: '22px 48px',
            flex: 1,
          }}
        >
          <div
            style={{
              fontFamily: '"InterBlack"',
              fontSize: 56,
              letterSpacing: 2,
              color: resultBorder,
              textAlign: 'center',
            }}
          >
            {resultText}
          </div>
          {potmPlayer && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 14, fontSize: 24, color: COL_TEAM_MM }}>
              🏅 POTM · {potmPlayer.short_name.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts,
      // Caching is OFF while we stabilize the renderer. A bad render gets stuck
      // serving 0-byte images otherwise. Re-enable once the route is reliable.
      headers: {
        'cache-control': 'no-store',
      },
    },
  )
}

// ───────────────────────────────────────────────────────────────
// Two-column data renderer for the innings block
// ───────────────────────────────────────────────────────────────
function DataColumns(props: {
  leftLabel: string
  leftRight1Label: string
  leftRight2Label: string
  leftRows: Array<{ name: string; v1: string; v1Color: string; v2: string }>
  rightLabel: string
  rightRight1Label: string
  rightRight2Label: string
  rightRows: Array<{ name: string; v1: string; v1Color: string; v2: string }>
}) {
  return (
    <div style={{ display: 'flex', marginTop: 18 }}>
      <Column
        nameLabel={props.leftLabel}
        v1Label={props.leftRight1Label}
        v2Label={props.leftRight2Label}
        rows={props.leftRows}
      />
      <div style={{ width: 2, background: 'rgba(255,255,255,0.08)', margin: '0 22px' }} />
      <Column
        nameLabel={props.rightLabel}
        v1Label={props.rightRight1Label}
        v2Label={props.rightRight2Label}
        rows={props.rightRows}
      />
    </div>
  )
}

function Column(props: {
  nameLabel: string
  v1Label: string
  v2Label: string
  rows: Array<{ name: string; v1: string; v1Color: string; v2: string }>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ flex: 1, fontSize: 18, color: COL_MUTED, letterSpacing: 2, fontWeight: 400 }}>{props.nameLabel}</div>
        <div style={{ width: 90, textAlign: 'right', fontSize: 18, color: COL_MUTED, letterSpacing: 2 }}>{props.v1Label}</div>
        <div style={{ width: 64, textAlign: 'right', fontSize: 18, color: COL_MUTED, letterSpacing: 2 }}>{props.v2Label}</div>
      </div>
      {props.rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 0 12px',
            borderBottom: i < props.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}
        >
          <div style={{ flex: 1, fontSize: 28, fontWeight: 700, color: 'white', letterSpacing: 0.5 }}>
            {truncate(r.name, 18)}
          </div>
          <div style={{ width: 90, textAlign: 'right', fontSize: 30, fontFamily: '"InterBlack"', color: r.v1Color }}>
            {r.v1}
          </div>
          <div style={{ width: 64, textAlign: 'right', fontSize: 26, fontWeight: 700, color: COL_MUTED }}>
            {r.v2}
          </div>
        </div>
      ))}
    </div>
  )
}
