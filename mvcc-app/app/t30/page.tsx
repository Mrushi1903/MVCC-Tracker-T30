'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { supabase, fetchTournament } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import { getPlayerImage } from '@/lib/playerImages'
import Nav from '@/components/Nav'
import TeamBanner from '@/components/TeamBanner'
import PlayerModal from '@/components/PlayerModal'
import BackgroundCanvas from '@/components/BackgroundCanvas'
import HorseWatermark from '@/components/HorseWatermark'

type StreakType = 'hot' | 'cold' | 'neutral'

type PlayerRow = {
  id: number
  name: string
  short_name: string
  team: 'MM' | 'HB'
  jersey_number: number
  is_external: boolean
  total_points: number
  total_runs: number
  total_wickets: number
  total_catches: number
  matches_played: number
  streak: StreakType
  last_two_avg: number
  season_avg: number
}

const PODIUM_MEDALS = ['🥇', '🥈', '🥉']

function StreakBadge({ streak, lastTwoAvg, seasonAvg }: { streak: StreakType; lastTwoAvg: number; seasonAvg: number }) {
  if (streak === 'neutral') return null
  const isHot = streak === 'hot'
  const tip = `Last 2 avg: ${lastTwoAvg.toFixed(1)} pts · Season avg: ${seasonAvg.toFixed(1)} pts`
  return (
    <motion.span
      title={tip}
      aria-label={tip}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{
        opacity: 1,
        scale: 1,
        filter: isHot
          ? ['drop-shadow(0 0 4px rgba(245,158,11,0.4))', 'drop-shadow(0 0 10px rgba(245,158,11,0.85))', 'drop-shadow(0 0 4px rgba(245,158,11,0.4))']
          : ['drop-shadow(0 0 4px rgba(56,189,248,0.4))', 'drop-shadow(0 0 10px rgba(56,189,248,0.85))', 'drop-shadow(0 0 4px rgba(56,189,248,0.4))'],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        display: 'inline-block',
        fontSize: 12,
        lineHeight: 1,
        cursor: 'help',
      }}
    >
      {isHot ? '🔥' : '❄️'}
    </motion.span>
  )
}

function CountUp({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 90, damping: 20, mass: 0.7 })
  const rounded = useTransform(spring, latest => Math.round(latest).toString())
  useEffect(() => { mv.set(value) }, [value, mv])
  return <motion.span className={className} style={style}>{rounded}</motion.span>
}

function PlayerAvatar({ shortName, size = 40, color, dimColor, borderColor, fontSize = 18 }: {
  shortName: string; size?: number; color: string
  dimColor: string; borderColor: string; fontSize?: number
}) {
  const imgSrc = getPlayerImage(shortName)
  const [imgError, setImgError] = useState(false)

  if (imgSrc && !imgError) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        overflow: 'hidden', border: `1px solid ${borderColor}`, flexShrink: 0,
      }}>
        <Image src={imgSrc} alt={shortName} width={size} height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setImgError(true)} />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: dimColor, border: `1px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bebas Neue', cursive", fontSize, color, flexShrink: 0,
    }}>
      {shortName.charAt(0)}
    </div>
  )
}

export default function HomePage() {
  const [players,        setPlayers]        = useState<PlayerRow[]>([])
  const [loading,        setLoading]        = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null)
  const [filter,         setFilter]         = useState<'all' | 'MM' | 'HB'>('all')

  useEffect(() => { fetchLeaderboard() }, [])

  async function fetchLeaderboard() {
    setLoading(true)
    // Tournament + players are independent — run them in parallel for ~half
    // the initial latency on this page.
    const [tournament, playersRes] = await Promise.all([
      fetchTournament('T30'),
      supabase.from('players').select('*').order('team').order('name'),
    ])
    const tournamentId = tournament?.id
    const rawPlayers = playersRes.data
    if (!rawPlayers) { setLoading(false); return }

    // Scope performances to this tournament's matches.
    let matchIds: number[] = []
    if (tournamentId) {
      const { data: ms } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId)
      matchIds = (ms ?? []).map(m => m.id)
    }

    const perfsQuery = supabase.from('performances').select('*')
    const { data: perfs } = matchIds.length > 0
      ? await perfsQuery.in('match_id', matchIds)
      : await perfsQuery // fallback: show all if migration not run yet
    const playerMap = new Map<number, PlayerRow>()
    for (const pl of rawPlayers) {
      playerMap.set(pl.id, {
        id: pl.id, name: pl.name, short_name: pl.short_name,
        team: pl.team, jersey_number: pl.jersey_number,
        is_external: pl.is_external ?? false,
        total_points: 0, total_runs: 0, total_wickets: 0, total_catches: 0, matches_played: 0,
        streak: 'neutral', last_two_avg: 0, season_avg: 0,
      })
    }

    // Track per-player perf points (ordered by match_id) for streak calc.
    const perfsByPlayer = new Map<number, { match_id: number; pts: number }[]>()

    if (perfs) {
      for (const perf of perfs) {
        const p = playerMap.get(perf.player_id)
        if (!p) continue
        const pts = calculatePoints({
          runs: perf.runs, balls_faced: perf.balls_faced,
          overs_bowled: perf.overs_bowled, runs_conceded: perf.runs_conceded,
          wickets: perf.wickets, catches: perf.catches,
          runout_fielder: perf.runout_fielder, runout_helper: perf.runout_helper,
          stumpings: perf.stumpings, is_potm: perf.is_potm,
          availability_points: perf.availability_points ?? 0,
        })
        p.total_points  += pts.total_points
        p.total_runs    += perf.runs
        p.total_wickets += perf.wickets
        p.total_catches += perf.catches
        p.matches_played += 1

        if (!perfsByPlayer.has(perf.player_id)) perfsByPlayer.set(perf.player_id, [])
        perfsByPlayer.get(perf.player_id)!.push({ match_id: perf.match_id, pts: pts.total_points })
      }
    }

    // Compute streak per player.
    // Hot:  last-2 avg > season avg * 1.20
    // Cold: last-2 avg < season avg * 0.80
    // Need at least 2 matches played to assign a streak.
    for (const p of Array.from(playerMap.values())) {
      if (p.matches_played < 2) continue
      const list = (perfsByPlayer.get(p.id) ?? []).slice().sort((a, b) => a.match_id - b.match_id)
      const lastTwo = list.slice(-2)
      const lastTwoAvg = (lastTwo[0].pts + lastTwo[1].pts) / 2
      const seasonAvg = p.total_points / p.matches_played
      p.last_two_avg = lastTwoAvg
      p.season_avg = seasonAvg
      if (seasonAvg <= 0) continue
      if (lastTwoAvg >= seasonAvg * 1.2) p.streak = 'hot'
      else if (lastTwoAvg <= seasonAvg * 0.8) p.streak = 'cold'
    }

    setPlayers(Array.from(playerMap.values()).sort((a, b) => b.total_points - a.total_points))
    setLoading(false)
  }

  const mmPlayers  = players.filter(p => p.team === 'MM')
  const hbPlayers  = players.filter(p => p.team === 'HB')
  // External player points DO NOT count toward team totals.
  const mmTotal    = mmPlayers.filter(p => !p.is_external).reduce((s, p) => s + p.total_points, 0)
  const hbTotal    = hbPlayers.filter(p => !p.is_external).reduce((s, p) => s + p.total_points, 0)
  const top3       = players.slice(0, 3)
  const restAll    = players.slice(3)
  const filtered   = filter === 'all' ? restAll : players.filter(p => p.team === filter)
  const showPodium = filter === 'all' && !loading && top3.length > 0

  return (
    <div style={{ background: '#0B1020', minHeight: '100vh', position: 'relative' }}>
      <BackgroundCanvas />
      <HorseWatermark />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />

        <main className="max-w-5xl mx-auto px-4 py-12">

          {/* ── HERO ──────────────────────────────────────── */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.span
                className="live-dot"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--green)', display: 'inline-block',
                  boxShadow: '0 0 12px rgba(74,222,128,0.7)',
                }}
              />
              <span className="font-mono text-xs tracking-[5px] uppercase" style={{ color: 'var(--green)' }}>
                Live Updates · Season 2026
              </span>
            </div>
            <h1 className="font-display tracking-widest" style={{
              fontSize: 'clamp(56px, 10vw, 100px)', lineHeight: 0.9,
              color: 'var(--text)',
              textShadow: '0 0 60px rgba(201,168,76,0.15), 0 2px 4px rgba(0,0,0,0.8)',
            }}>
              STANDINGS
            </h1>
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              style={{
                width: 80, height: 3, marginTop: 12,
                background: 'linear-gradient(90deg, var(--mm), transparent)',
                borderRadius: 99,
              }}
            />
            <p className="font-mono text-sm mt-4" style={{ color: 'var(--text3)' }}>
              Mavericks Cricket Club · T30 Internal Tournament · 8 Matches
            </p>
          </motion.div>

          {/* ── TEAM BANNER ───────────────────────────────── */}
          <TeamBanner mmTotal={mmTotal} hbTotal={hbTotal} />

          {/* ── TOP 3 PODIUM ──────────────────────────────── */}
          {showPodium && (
            <div className="mb-10">
              <motion.div
                className="flex items-center gap-3 mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
                  Top Performers
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
              </motion.div>

              <div className="grid grid-cols-3 gap-4">
                {top3.map((player, i) => {
                  const isMM    = player.team === 'MM'
                  const color   = isMM ? 'var(--mm)' : 'var(--hb)'
                  const dimC    = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
                  const borderC = isMM ? 'var(--mm-border)' : 'var(--hb-border)'
                  const glowC   = isMM ? 'rgba(201,168,76,0.18)' : 'rgba(59,130,246,0.18)'
                  const isFirst = i === 0

                  return (
                    <motion.div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      initial={{ opacity: 0, y: 20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 140, damping: 18 }}
                      whileHover={{ y: -3, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
                      whileTap={{ scale: 0.98 }}
                      className="cursor-pointer rounded-2xl overflow-hidden relative"
                      style={{
                        background: isFirst
                          ? 'linear-gradient(160deg, #1c1400 0%, #120e02 40%, rgba(11,18,33,0.95) 100%)'
                          : 'rgba(11,18,33,0.9)',
                        border: `1px solid ${isFirst ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
                        boxShadow: isFirst
                          ? `0 8px 50px ${glowC}, 0 0 0 1px rgba(201,168,76,0.1)`
                          : `0 4px 20px rgba(0,0,0,0.4)`,
                        marginTop: i === 2 ? 20 : 0,
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <div style={{
                        height: 2,
                        background: isFirst
                          ? 'linear-gradient(90deg, transparent, #c9a84c, #f5e070, #c9a84c, transparent)'
                          : `linear-gradient(90deg, transparent, ${color}80, transparent)`,
                        animation: isFirst ? 'shimmer 3s linear infinite' : 'none',
                        backgroundSize: '200% auto',
                      }} />

                      <div className="p-5 text-center">
                        <motion.div
                          className="text-4xl mb-4"
                          animate={isFirst ? { y: [0, -6, 0] } : {}}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          {PODIUM_MEDALS[i]}
                        </motion.div>

                        <div className="flex justify-center mb-3 relative">
                          <PlayerAvatar
                            shortName={player.short_name}
                            size={isFirst ? 76 : 60}
                            color={color} dimColor={dimC} borderColor={borderC}
                            fontSize={isFirst ? 30 : 22}
                          />
                          {isFirst && (
                            <>
                              <motion.div
                                animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                  position: 'absolute', inset: -3, borderRadius: 24,
                                  border: '1px solid rgba(201,168,76,0.3)',
                                }}
                              />
                              <motion.div
                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.08, 1] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                                style={{
                                  position: 'absolute', inset: -8, borderRadius: 28,
                                  border: '1px solid rgba(201,168,76,0.1)',
                                }}
                              />
                            </>
                          )}
                        </div>

                        <div className="font-display text-2xl tracking-wider mb-0.5 flex items-center justify-center gap-2" style={{ color: 'var(--text)' }}>
                          {player.short_name.toUpperCase()}
                          <StreakBadge streak={player.streak} lastTwoAvg={player.last_two_avg} seasonAvg={player.season_avg} />
                        </div>
                        <div className="font-mono text-xs mb-4" style={{ color: 'var(--text3)' }}>
                          {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                        </div>

                        <CountUp
                          value={player.total_points}
                          className="font-display leading-none block"
                          style={isFirst
                            ? { fontSize: 56, color: 'var(--mm)', textShadow: '0 0 24px rgba(201,168,76,0.5)' }
                            : { fontSize: 56, color }}
                        />
                        <div className="font-mono text-[10px] tracking-widest mt-1 mb-4" style={{ color: 'var(--text3)' }}>
                          TOURNAMENT POINTS
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'RUNS',    val: player.total_runs },
                              { label: 'WKTS',    val: player.total_wickets },
                              { label: 'MATCHES', val: player.matches_played },
                            ].map(s => (
                              <div key={s.label} className="text-center">
                                <div className="font-display text-lg" style={{ color: 'var(--text2)' }}>{s.val}</div>
                                <div className="font-mono text-[8px] tracking-widest" style={{ color: 'var(--text3)' }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── FILTER TABS ────────────────────────────────── */}
          <motion.div
            className="flex gap-2 mb-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06, delayChildren: 0.3 } },
            }}
          >
            {(['all', 'MM', 'HB'] as const).map(f => {
              const active  = filter === f
              const fColor  = f === 'MM' ? 'var(--mm)' : f === 'HB' ? 'var(--hb)' : 'var(--accent)'
              const fDim    = f === 'MM' ? 'var(--mm-dim)' : f === 'HB' ? 'var(--hb-dim)' : 'var(--accent-dim)'
              const fBorder = f === 'MM' ? 'var(--mm-border)' : f === 'HB' ? 'var(--hb-border)' : 'var(--accent-border)'
              return (
                <motion.button
                  key={f}
                  onClick={() => setFilter(f)}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2 rounded-xl font-mono text-xs tracking-widest uppercase"
                  style={{
                    background: active ? fDim : 'rgba(11,18,33,0.6)',
                    border: `1px solid ${active ? fBorder : 'var(--border)'}`,
                    color: active ? fColor : 'var(--text3)',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    boxShadow: active ? `0 4px 20px ${fDim}` : 'none',
                    transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease',
                  }}
                >
                  {f === 'all' ? '⚡ All Players' : f === 'MM' ? '🟡 Mighty Mavericks' : '🔵 Hell Boys'}
                </motion.button>
              )
            })}
          </motion.div>

          {/* ── LEADERBOARD ────────────────────────────────── */}
          {loading ? (
            <div className="text-center py-32">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  border: '2px solid var(--border2)', borderTop: '2px solid var(--mm)',
                  margin: '0 auto 20px',
                }}
              />
              <div className="font-display text-3xl tracking-[6px]" style={{ color: 'var(--border2)' }}>
                LOADING
              </div>
            </div>
          ) : (
            <div>
              {filter === 'all' && players.length > 3 && (
                <motion.div
                  className="flex items-center gap-3 mb-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
                    Full Rankings
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
                </motion.div>
              )}

              <motion.div
                className="flex flex-col gap-2"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } },
                }}
              >
                {filtered.map((player) => {
                  const rank    = players.indexOf(player) + 1
                  const isMM    = player.team === 'MM'
                  const color   = isMM ? 'var(--mm)' : 'var(--hb)'
                  const dimC    = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
                  const borderC = isMM ? 'var(--mm-border)' : 'var(--hb-border)'
                  const hoverShadow = isMM
                    ? '0 12px 36px rgba(201,168,76,0.18), 0 0 0 1px rgba(201,168,76,0.25)'
                    : '0 12px 36px rgba(56,189,248,0.18), 0 0 0 1px rgba(56,189,248,0.25)'

                  return (
                    <motion.div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
                      }}
                      whileHover={{ y: -2, boxShadow: hoverShadow, transition: { duration: 0.18 } }}
                      whileTap={{ scale: 0.995 }}
                      className="cursor-pointer rounded-xl flex items-center gap-4 px-5 py-4"
                      style={{
                        background: 'rgba(11,18,33,0.75)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${color}`,
                        backdropFilter: 'blur(12px)',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: `linear-gradient(90deg, ${isMM ? '#c9a84c06' : '#3b82f606'} 0%, transparent 40%)`,
                      }} />

                      <div className="w-8 text-center flex-shrink-0 font-display text-xl"
                        style={{ color: 'var(--text3)' }}>
                        {rank}
                      </div>

                      <PlayerAvatar shortName={player.short_name} size={42}
                        color={color} dimColor={dimC} borderColor={borderC} />

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                          <Link
                            href={`/t30/player/${player.short_name.toLowerCase()}`}
                            onClick={e => e.stopPropagation()}
                            className="hover:underline decoration-1 underline-offset-2"
                            style={{ color: 'var(--text)' }}
                          >
                            {player.short_name}
                          </Link>
                          <StreakBadge streak={player.streak} lastTwoAvg={player.last_two_avg} seasonAvg={player.season_avg} />
                          {player.is_external && (
                            <span
                              className="font-mono"
                              style={{
                                fontSize: 9,
                                letterSpacing: '0.12em',
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: 'rgba(245,158,11,0.12)',
                                color: 'var(--gold)',
                                border: '1px solid rgba(245,158,11,0.3)',
                              }}
                            >
                              EXT
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs mt-0.5 flex items-center gap-1.5"
                          style={{ color: 'var(--text3)' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
                          {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                          {player.matches_played > 0 && (
                            <span style={{ color: 'var(--border2)' }}>· {player.matches_played}M</span>
                          )}
                        </div>
                      </div>

                      <div className="hidden sm:flex gap-6 text-right">
                        <div>
                          <div className="font-display text-xl" style={{ color: 'var(--text2)' }}>{player.total_runs}</div>
                          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>RUNS</div>
                        </div>
                        <div>
                          <div className="font-display text-xl" style={{ color: 'var(--text2)' }}>{player.total_wickets}</div>
                          <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>WKTS</div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <CountUp
                          value={player.total_points}
                          className="font-display text-4xl block"
                          style={{
                            color,
                            textShadow: `0 0 20px ${isMM ? 'rgba(201,168,76,0.4)' : 'rgba(59,130,246,0.4)'}`,
                          }}
                        />
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>PTS</div>
                      </div>
                    </motion.div>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="text-center py-24 rounded-2xl"
                    style={{ background: 'rgba(11,18,33,0.8)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
                    <motion.div
                      className="text-6xl mb-4"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ display: 'inline-block' }}
                    >
                      🏏
                    </motion.div>
                    <div className="font-display text-3xl tracking-widest mb-2" style={{ color: 'var(--border2)' }}>
                      SEASON STARTING SOON
                    </div>
                    <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                      Standings update live after each match
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* ── FOOTER ─────────────────────────────────────── */}
          <div className="mt-16 text-center">
            <div style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, var(--border2), transparent)',
              marginBottom: 16,
            }} />
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              Click any player for full match breakdown · Points update live
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--border2)' }}>
              MVCC T30 2026 · Michigan · #MaverickSpirit
            </p>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {selectedPlayer && (
          <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
