'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase, Tournament, Player } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import Nav from '@/components/Nav'
import BackgroundCanvas from '@/components/BackgroundCanvas'
import HorseWatermark from '@/components/HorseWatermark'

type TournamentStats = {
  matches_total: number
  matches_played: number
  wins: number
  losses: number
  mm_points: number
  hb_points: number
  leader: { name: string; points: number; team: 'MM' | 'HB' } | null
}

type TournamentWithStats = Tournament & { stats: TournamentStats }

export default function HomePage() {
  const [tournaments, setTournaments] = useState<TournamentWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Players never change per tournament, so fetch them once and share.
      // Run tournaments + players in parallel to halve the first round-trip.
      const [tournamentsRes, playersRes] = await Promise.all([
        supabase
          .from('tournaments')
          .select('*')
          .order('status', { ascending: true })
          .order('year', { ascending: false }),
        supabase
          .from('players')
          .select('id, name, short_name, team, jersey_number, cc_player_id, is_external'),
      ])

      if (cancelled || !tournamentsRes.data) { setLoading(false); return }
      const sorted = (tournamentsRes.data as Tournament[])
        .slice()
        .sort((a, b) => statusRank(a.status) - statusRank(b.status))
      const allPlayers = (playersRes.data as Player[]) ?? []

      const enriched = await Promise.all(
        sorted.map(async t => ({
          ...t,
          stats: await loadStats(t.id, allPlayers),
        })),
      )
      if (cancelled) return
      setTournaments(enriched)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ background: '#0B1020', minHeight: '100vh', position: 'relative' }}>
      <BackgroundCanvas />
      <HorseWatermark />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />

        <main className="max-w-4xl mx-auto px-4 py-12 pb-32">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.9 }}
            className="flex justify-center mb-6"
          >
            <div
              style={{
                width: 88, height: 88, borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid rgba(201,168,76,0.55)',
                boxShadow: '0 0 32px rgba(201,168,76,0.25)',
              }}
            >
              <img src="/mavericks-logo.jpeg" alt="MVCC" className="w-full h-full object-cover" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
            className="text-center mb-2"
          >
            <p className="font-mono text-xs tracking-[5px] uppercase mb-3" style={{ color: 'var(--accent)' }}>
              Mavericks Cricket Club · 2026
            </p>
            <h1
              className="font-display tracking-widest"
              style={{
                fontSize: 'clamp(56px, 12vw, 96px)',
                lineHeight: 0.92,
                color: 'var(--text)',
                textShadow: '0 0 60px rgba(0,229,255,0.18), 0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              TOURNAMENTS
            </h1>
            <p className="font-mono text-sm mt-4" style={{ color: 'var(--text3)' }}>
              Select a tournament to view standings
            </p>
          </motion.div>

          <div className="mt-12 flex flex-col gap-5">
            {loading && (
              <div className="text-center py-16 font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                LOADING TOURNAMENTS…
              </div>
            )}

            {!loading && tournaments.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} index={i} />
            ))}

            {!loading && tournaments.length === 0 && (
              <div
                className="text-center py-16 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <div className="text-4xl mb-2">🏏</div>
                <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                  No tournaments yet
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 text-center">
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)', marginBottom: 16 }} />
            <p className="font-mono text-xs" style={{ color: 'var(--border2)' }}>
              MVCC · Michigan · #MaverickSpirit
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

function statusRank(s: Tournament['status']): number {
  if (s === 'active') return 0
  if (s === 'upcoming') return 1
  return 2
}

async function loadStats(tournamentId: number, players: Player[]): Promise<TournamentStats> {
  // Matches first (we need their IDs to query performances).
  const { data: matches } = await supabase
    .from('matches')
    .select('id, is_played, result')
    .eq('tournament_id', tournamentId)
  const matches_total = (matches ?? []).length
  const matches_played = (matches ?? []).filter(m => m.is_played).length
  const wins = (matches ?? []).filter(m => m.result === 'won').length
  const losses = (matches ?? []).filter(m => m.result === 'lost').length

  const matchIds = (matches ?? []).map(m => m.id)
  if (matchIds.length === 0) {
    return { matches_total, matches_played, wins, losses, mm_points: 0, hb_points: 0, leader: null }
  }

  // Players list is passed in (already fetched at the top level), so we just
  // fetch perfs here. One round-trip instead of two per tournament.
  const { data: perfs } = await supabase
    .from('performances')
    .select('*')
    .in('match_id', matchIds)

  const playerMap = new Map<number, Player>()
  for (const p of players) playerMap.set(p.id, p)

  let mm_points = 0
  let hb_points = 0
  const playerTotals = new Map<number, number>()

  for (const perf of perfs ?? []) {
    const pts = calculatePoints({
      runs: perf.runs, balls_faced: perf.balls_faced,
      overs_bowled: perf.overs_bowled, runs_conceded: perf.runs_conceded,
      wickets: perf.wickets, catches: perf.catches,
      runout_fielder: perf.runout_fielder, runout_helper: perf.runout_helper,
      stumpings: perf.stumpings, is_potm: perf.is_potm,
      availability_points: perf.availability_points ?? 0,
    })
    playerTotals.set(perf.player_id, (playerTotals.get(perf.player_id) ?? 0) + pts.total_points)
    const pl = playerMap.get(perf.player_id)
    if (!pl || pl.is_external) continue
    if (pl.team === 'MM') mm_points += pts.total_points
    else if (pl.team === 'HB') hb_points += pts.total_points
  }

  let leader: TournamentStats['leader'] = null
  let bestPts = -1
  playerTotals.forEach((pts, pid) => {
    const pl = playerMap.get(pid)
    if (!pl) return
    if (pts > bestPts) {
      bestPts = pts
      leader = { name: pl.short_name, points: pts, team: pl.team }
    }
  })

  return { matches_total, matches_played, wins, losses, mm_points, hb_points, leader }
}

// ───────────────────────────────────────────────────────────────
// CARD
// ───────────────────────────────────────────────────────────────

function TournamentCard({ tournament: t, index }: { tournament: TournamentWithStats; index: number }) {
  const isActive = t.status === 'active'
  const isCompleted = t.status === 'completed'
  const clickable = isActive || isCompleted
  const href = clickable ? `/${t.short_name.toLowerCase()}` : '#'
  const total = t.stats.mm_points + t.stats.hb_points
  const mmPct = total > 0 ? (t.stats.mm_points / total) * 100 : 50

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.25 + index * 0.1 }}
      whileHover={clickable
        ? { y: -3, boxShadow: '0 18px 50px rgba(201,168,76,0.22), 0 0 0 1px rgba(201,168,76,0.3)', transition: { duration: 0.2 } }
        : { y: -1, transition: { duration: 0.18 } }
      }
      whileTap={clickable ? { scale: 0.995 } : {}}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: clickable ? '0 8px 36px rgba(0,0,0,0.4)' : '0 4px 18px rgba(0,0,0,0.3)',
        opacity: clickable ? 1 : 0.6,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      {/* Top gradient border */}
      <div style={{
        height: 2,
        background: isActive
          ? 'linear-gradient(90deg, transparent, #c9a84c, #00E5FF, transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
      }} />

      <div className="p-6 md:p-7">
        {/* Top row: format badge + status */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div
              className="font-display"
              style={{
                fontSize: 'clamp(48px, 8vw, 72px)',
                lineHeight: 0.9,
                color: isActive ? 'var(--mm)' : 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
                textShadow: isActive ? '0 0 28px rgba(201,168,76,0.35)' : 'none',
              }}
            >
              {t.format}
            </div>
            <div className="font-medium text-base mt-2" style={{ color: 'var(--text)' }}>
              {t.name}
            </div>
          </div>

          <StatusPill status={t.status} />
        </div>

        {/* Body — depends on status */}
        {isActive ? (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Stat label="Matches Played" value={`${t.stats.matches_played}/${t.stats.matches_total}`} accent="var(--accent)" />
              <Stat label="Record (W–L)" value={`${t.stats.wins}–${t.stats.losses}`} accent="var(--green)" />
            </div>

            {t.stats.leader && (
              <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                }}>
                <span style={{ fontSize: 18 }}>🥇</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
                    Current leader
                  </div>
                  <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                    {t.stats.leader.name}
                    <span className="font-mono text-xs ml-2" style={{ color: t.stats.leader.team === 'MM' ? 'var(--mm)' : 'var(--hb)' }}>
                      {t.stats.leader.team}
                    </span>
                  </div>
                </div>
                <div className="font-display text-2xl" style={{ color: 'var(--mm)' }}>
                  {t.stats.leader.points}
                  <span className="font-mono text-[10px] ml-1" style={{ color: 'var(--text3)' }}>PTS</span>
                </div>
              </div>
            )}

            {/* MM vs HB mini bar */}
            <div className="mb-5">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-mono text-[11px] tracking-widest" style={{ color: 'var(--mm)' }}>
                  MM <span style={{ color: 'var(--text2)' }}>{t.stats.mm_points}</span>
                </span>
                <span className="font-mono text-[11px] tracking-widest" style={{ color: 'var(--hb)' }}>
                  <span style={{ color: 'var(--text2)' }}>{t.stats.hb_points}</span> HB
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mmPct}%` }}
                  transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.4 + index * 0.1 }}
                  style={{ background: 'var(--mm)' }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - mmPct}%` }}
                  transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.4 + index * 0.1 }}
                  style={{ background: 'var(--hb)' }}
                />
              </div>
            </div>

            <div
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[3px] uppercase px-4 py-2 rounded-xl"
              style={{
                color: 'var(--accent)',
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.3)',
                boxShadow: '0 0 18px rgba(0,229,255,0.18)',
              }}
            >
              View Standings
              <span aria-hidden>→</span>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              {t.status === 'upcoming' ? 'Season starts soon.' : 'Tournament wrapped — open to view final standings.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )

  return clickable ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function StatusPill({ status }: { status: Tournament['status'] }) {
  const map = {
    active:    { label: 'LIVE',        color: 'var(--green)', dim: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)', pulse: true },
    upcoming:  { label: 'COMING SOON', color: 'var(--text2)', dim: 'rgba(255,255,255,0.06)', border: 'var(--border2)', pulse: false },
    completed: { label: 'COMPLETED',   color: 'var(--gold)',  dim: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', pulse: false },
  } as const
  const meta = map[status]
  return (
    <div
      className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[2px] uppercase px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ color: meta.color, background: meta.dim, border: `1px solid ${meta.border}` }}
    >
      {meta.pulse && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block', boxShadow: `0 0 8px ${meta.color}` }}
        />
      )}
      {meta.label}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
      <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
      <div className="font-display text-2xl mt-0.5" style={{ color: accent }}>
        {value}
      </div>
    </div>
  )
}
