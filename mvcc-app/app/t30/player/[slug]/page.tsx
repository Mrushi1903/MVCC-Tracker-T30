'use client'

import { useEffect, useState, use, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { supabase, fetchTournament, Player, Match, Performance } from '@/lib/supabase'
import { calculatePoints, getStrikeRate, getEconomy } from '@/lib/points'
import { getPlayerImage } from '@/lib/playerImages'
import Nav from '@/components/Nav'
import BackgroundCanvas from '@/components/BackgroundCanvas'
import HorseWatermark from '@/components/HorseWatermark'

type StreakType = 'hot' | 'cold' | 'neutral'
type MatchPerf = Performance & { match: Match }

export default function PlayerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [player, setPlayer] = useState<Player | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [perfs, setPerfs] = useState<MatchPerf[]>([])
  const [loading, setLoading] = useState(true)
  const [notFoundState, setNotFoundState] = useState(false)
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)
  const [shareConfirm, setShareConfirm] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)

      // Find the player by slug (case-insensitive on short_name).
      const { data: rawPlayers } = await supabase.from('players').select('*')
      const found = (rawPlayers as Player[] | null)?.find(
        p => p.short_name.toLowerCase() === slug.toLowerCase(),
      )
      if (!found) {
        setNotFoundState(true)
        setLoading(false)
        return
      }
      setPlayer(found)

      // Tournament scope: only T30 matches.
      const tournament = await fetchTournament('T30')
      const { data: rawMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournament?.id ?? -1)
        .order('match_number')
      const ms = (rawMatches as Match[] | null) ?? []
      setMatches(ms)

      const matchIds = ms.map(m => m.id)
      const { data: rawPerfs } =
        matchIds.length > 0
          ? await supabase
              .from('performances')
              .select('*, match:matches(*)')
              .eq('player_id', found.id)
              .in('match_id', matchIds)
              .order('match_id', { ascending: true })
          : { data: [] }
      setPerfs((rawPerfs as MatchPerf[] | null) ?? [])

      setLoading(false)
    })()
  }, [slug])

  // Set document title.
  useEffect(() => {
    if (player) document.title = `${player.short_name} · MVCC T30 2026`
  }, [player])

  // ── Derived stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!player) return null
    let totalPoints = 0
    let totalRuns = 0
    let totalBalls = 0
    let totalWickets = 0
    let totalCatches = 0
    let totalOvers = 0
    let totalRunsConceded = 0
    let topScore = 0
    let bestBowling = 0

    const chartPoints: { match_number: number; pts: number; label: string }[] = []
    const orderedPerfs = perfs.slice().sort((a, b) => (a.match?.match_number ?? 0) - (b.match?.match_number ?? 0))

    for (const perf of orderedPerfs) {
      const pts = calculatePoints({
        runs: perf.runs, balls_faced: perf.balls_faced,
        overs_bowled: perf.overs_bowled, runs_conceded: perf.runs_conceded,
        wickets: perf.wickets, catches: perf.catches,
        runout_fielder: perf.runout_fielder, runout_helper: perf.runout_helper,
        stumpings: perf.stumpings, is_potm: perf.is_potm,
        availability_points: perf.availability_points ?? 0,
      })
      totalPoints += pts.total_points
      totalRuns += perf.runs
      totalBalls += perf.balls_faced
      totalWickets += perf.wickets
      totalCatches += perf.catches
      totalOvers += perf.overs_bowled
      totalRunsConceded += perf.runs_conceded
      if (perf.runs > topScore) topScore = perf.runs
      if (perf.wickets > bestBowling) bestBowling = perf.wickets

      chartPoints.push({
        match_number: perf.match?.match_number ?? 0,
        pts: pts.total_points,
        label: `M${perf.match?.match_number} vs ${perf.match?.opponent_short || perf.match?.opponent?.split(' ')[0] || '?'}`,
      })
    }

    const matchesPlayed = orderedPerfs.length
    const seasonAvg = matchesPlayed > 0 ? totalPoints / matchesPlayed : 0
    const careerSR = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '—'
    const careerEcon = totalOvers > 0 ? (totalRunsConceded / totalOvers).toFixed(2) : '—'

    // Streak: last 2 vs season avg ±20% (matches the leaderboard logic).
    let streak: StreakType = 'neutral'
    let lastTwoAvg = 0
    if (matchesPlayed >= 2) {
      const last2 = chartPoints.slice(-2)
      lastTwoAvg = (last2[0].pts + last2[1].pts) / 2
      if (seasonAvg > 0) {
        if (lastTwoAvg >= seasonAvg * 1.2) streak = 'hot'
        else if (lastTwoAvg <= seasonAvg * 0.8) streak = 'cold'
      }
    }

    return {
      totalPoints, totalRuns, totalBalls, totalWickets, totalCatches,
      totalOvers, totalRunsConceded, topScore, bestBowling,
      matchesPlayed, seasonAvg, careerSR, careerEcon,
      streak, lastTwoAvg,
      chartPoints, orderedPerfs,
    }
  }, [player, perfs])

  if (notFoundState) notFound()

  // ── Theme tokens ─────────────────────────────────────────────
  const isMM = player?.team === 'MM'
  const color = isMM ? '#c9a84c' : '#38bdf8'
  const dimColor = isMM ? 'rgba(201,168,76,0.12)' : 'rgba(56,189,248,0.12)'
  const borderColor = isMM ? 'rgba(201,168,76,0.35)' : 'rgba(56,189,248,0.35)'
  const glowColor = isMM ? 'rgba(201,168,76,0.18)' : 'rgba(56,189,248,0.18)'
  const imgSrc = player ? getPlayerImage(player.short_name) : null

  async function handleShare() {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: player ? `${player.short_name} · MVCC T30 2026` : 'MVCC',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setShareConfirm(true)
        setTimeout(() => setShareConfirm(false), 1800)
      }
    } catch {
      // User dismissed share sheet — silently ignore.
    }
  }

  return (
    <div style={{ background: '#0B1020', minHeight: '100vh', position: 'relative' }}>
      <BackgroundCanvas />
      <HorseWatermark />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />

        <main className="max-w-4xl mx-auto px-4 py-8 pb-32">

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6"
          >
            <Link
              href="/t30"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[3px] uppercase px-3 py-1.5 rounded-lg"
              style={{
                color: 'var(--text2)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
              }}
            >
              ← Back to Standings
            </Link>
          </motion.div>

          {loading || !player || !stats ? (
            <Loader color={color} />
          ) : (
            <>
              {/* ── HERO ─────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="relative overflow-hidden rounded-2xl p-6 md:p-8 mb-6"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${borderColor}`,
                  boxShadow: `0 8px 32px ${glowColor}, 0 0 0 1px rgba(255,255,255,0.04)`,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: `radial-gradient(ellipse 60% 80% at ${isMM ? '0%' : '100%'} 50%, ${glowColor}, transparent)`,
                  }}
                />

                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Photo */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                    style={{
                      width: 112, height: 112, borderRadius: 24, overflow: 'hidden',
                      border: `2px solid ${color}`, flexShrink: 0,
                      boxShadow: `0 4px 28px ${glowColor}`,
                    }}
                  >
                    {imgSrc && !imgError ? (
                      <Image src={imgSrc} alt={player.short_name} width={112} height={112}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        onError={() => setImgError(true)} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', background: dimColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Bebas Neue', cursive", fontSize: 48, color,
                      }}>
                        {player.short_name.charAt(0)}
                      </div>
                    )}
                  </motion.div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text3)' }}>
                      Player Profile
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="font-display tracking-widest" style={{ fontSize: 'clamp(40px, 7vw, 64px)', lineHeight: 0.95, color: 'var(--text)' }}>
                        {player.short_name.toUpperCase()}
                      </h1>
                      {stats.streak !== 'neutral' && (
                        <motion.span
                          title={`Last 2 avg: ${stats.lastTwoAvg.toFixed(1)} pts · Season avg: ${stats.seasonAvg.toFixed(1)} pts`}
                          animate={{
                            filter: stats.streak === 'hot'
                              ? ['drop-shadow(0 0 6px rgba(245,158,11,0.4))', 'drop-shadow(0 0 14px rgba(245,158,11,0.9))', 'drop-shadow(0 0 6px rgba(245,158,11,0.4))']
                              : ['drop-shadow(0 0 6px rgba(56,189,248,0.4))', 'drop-shadow(0 0 14px rgba(56,189,248,0.9))', 'drop-shadow(0 0 6px rgba(56,189,248,0.4))'],
                          }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          style={{ fontSize: 32, lineHeight: 1 }}
                        >
                          {stats.streak === 'hot' ? '🔥' : '❄️'}
                        </motion.span>
                      )}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
                      {player.name}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span
                        className="font-mono text-xs tracking-widest px-2.5 py-1 rounded-full"
                        style={{ color, background: dimColor, border: `1px solid ${borderColor}` }}
                      >
                        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
                        {isMM ? 'MIGHTY MAVERICKS' : 'HELL BOYS'}
                      </span>
                      {player.jersey_number > 0 && (
                        <span className="font-mono text-xs tracking-widest px-2.5 py-1 rounded-full"
                          style={{ color: 'var(--text2)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                          #{player.jersey_number}
                        </span>
                      )}
                      {player.is_external && (
                        <span className="font-mono text-xs tracking-widest px-2.5 py-1 rounded-full"
                          style={{ color: 'var(--gold)', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
                          EXT · doesn&apos;t count toward team total
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total + share */}
                  <div className="md:text-right flex md:flex-col items-baseline md:items-end gap-3 md:gap-2">
                    <div>
                      <div className="font-display leading-none" style={{ fontSize: 56, color, textShadow: `0 0 30px ${glowColor}` }}>
                        {stats.totalPoints}
                      </div>
                      <div className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'var(--text3)' }}>
                        TOTAL POINTS
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleShare}
                      className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                      style={{
                        background: shareConfirm ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${shareConfirm ? 'rgba(74,222,128,0.4)' : 'var(--border2)'}`,
                        color: shareConfirm ? 'var(--green)' : 'var(--text2)',
                        cursor: 'pointer',
                        transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
                      }}
                    >
                      {shareConfirm ? '✓ Copied' : '↗ Share'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* ── STATS GRID ────────────────────────────── */}
              <SectionHeader label="Career Stats" />
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } }}
              >
                <StatCard label="Total Points" value={stats.totalPoints} color={color} large />
                <StatCard label="Runs" value={stats.totalRuns} />
                <StatCard label="Wickets" value={stats.totalWickets} />
                <StatCard label="Catches" value={stats.totalCatches} />
                <StatCard label="Matches" value={stats.matchesPlayed} />
                <StatCard label="Top Score" value={stats.topScore} />
                <StatCard label="Best Bowling" value={stats.bestBowling > 0 ? `${stats.bestBowling}W` : '—'} />
                <StatCard label="Career SR" value={stats.careerSR} />
                <StatCard label="Career Econ" value={stats.careerEcon} />
              </motion.div>

              {/* ── POINTS CHART ──────────────────────────── */}
              <SectionHeader label="Points by Match" />
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="rounded-2xl p-4 mb-8"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  height: 280,
                }}
              >
                {stats.chartPoints.length === 0 ? (
                  <div className="h-full flex items-center justify-center font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                    No matches played yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.chartPoints} margin={{ top: 16, right: 16, bottom: 12, left: -10 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="match_number"
                        tick={{ fill: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                        tickFormatter={(v) => `M${v}`}
                      />
                      <YAxis
                        tick={{ fill: '#94A3B8', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                        width={36}
                      />
                      <ReferenceLine
                        y={stats.seasonAvg}
                        stroke="rgba(255,255,255,0.2)"
                        strokeDasharray="3 3"
                        label={{
                          value: `Avg ${stats.seasonAvg.toFixed(0)}`,
                          position: 'right',
                          fill: '#64748B',
                          fontSize: 10,
                          fontFamily: 'JetBrains Mono',
                        }}
                      />
                      <Tooltip
                        cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
                        contentStyle={{
                          background: 'rgba(15,21,40,0.95)',
                          border: `1px solid ${borderColor}`,
                          borderRadius: 12,
                          fontFamily: 'JetBrains Mono',
                          fontSize: 12,
                          color: '#E2E8F0',
                        }}
                        labelFormatter={(v, payload) => {
                          const item = payload?.[0]?.payload as { label?: string } | undefined
                          return item?.label ?? `M${v}`
                        }}
                        formatter={(v) => [`${v} pts`, ''] as [string, string]}
                      />
                      <Line
                        type="monotone"
                        dataKey="pts"
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ fill: color, r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: color, stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
                        isAnimationActive
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* ── FORM GUIDE ────────────────────────────── */}
              <SectionHeader label="Form Guide · Last 5" />
              <FormGuide matches={matches} perfs={stats.orderedPerfs} color={color} />

              {/* ── SEASON MILESTONES ─────────────────────── */}
              <SectionHeader label="Season Milestones" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                <Milestone label="Runs" value={stats.totalRuns} target={nextMilestone(stats.totalRuns, [50, 100, 200, 300, 500])} color={color} />
                <Milestone label="Wickets" value={stats.totalWickets} target={nextMilestone(stats.totalWickets, [5, 10, 15, 20, 30])} color={color} />
                <Milestone label="Catches" value={stats.totalCatches} target={nextMilestone(stats.totalCatches, [3, 5, 10, 15, 20])} color={color} />
              </div>

              {/* ── MATCH BY MATCH ──────────────────────── */}
              <SectionHeader label="Match by Match" />
              {stats.orderedPerfs.length === 0 ? (
                <div className="rounded-2xl p-10 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                  <div className="text-3xl mb-2">🏏</div>
                  <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                    NO MATCHES PLAYED YET
                  </div>
                </div>
              ) : (
                <motion.div
                  className="flex flex-col gap-3"
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.25 } } }}
                >
                  {stats.orderedPerfs.map(perf => {
                    const pts = calculatePoints({
                      runs: perf.runs, balls_faced: perf.balls_faced,
                      overs_bowled: perf.overs_bowled, runs_conceded: perf.runs_conceded,
                      wickets: perf.wickets, catches: perf.catches,
                      runout_fielder: perf.runout_fielder, runout_helper: perf.runout_helper,
                      stumpings: perf.stumpings, is_potm: perf.is_potm,
                      availability_points: perf.availability_points ?? 0,
                    })
                    const expanded = expandedMatch === perf.id
                    const dateStr = (() => {
                      const [y, mo, d] = (perf.match?.date || '').split('-').map(Number)
                      return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    })()
                    return (
                      <motion.div
                        key={perf.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
                        }}
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <button
                          onClick={() => setExpandedMatch(expanded ? null : perf.id)}
                          className="w-full text-left px-4 py-3 flex items-center justify-between"
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                              Match {perf.match?.match_number} · {dateStr}
                            </div>
                            <div className="font-medium text-sm mt-0.5" style={{ color: 'var(--text)' }}>
                              vs {perf.match?.opponent}
                            </div>
                            {perf.match?.result && (
                              <div className="font-mono text-xs mt-0.5"
                                style={{ color: perf.match.result === 'won' ? 'var(--green)' : perf.match.result === 'lost' ? 'var(--red)' : 'var(--text3)' }}>
                                {perf.match.result.toUpperCase()}
                                {perf.match.mvcc_score && ` · MVCC ${perf.match.mvcc_score}`}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-display text-2xl" style={{ color, textShadow: `0 0 14px ${glowColor}` }}>
                                {pts.total_points}
                              </div>
                              <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>PTS</div>
                            </div>
                            <motion.span
                              animate={{ rotate: expanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ color: 'var(--text3)' }}
                            >
                              ▾
                            </motion.span>
                          </div>
                        </button>
                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              key="body"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                  <SubStat title="Batting" rows={[
                                    [`${perf.runs} (${perf.balls_faced})`, 'Runs'],
                                    [getStrikeRate(perf.runs, perf.balls_faced), 'SR'],
                                    [`${perf.fours ?? 0}·4s ${perf.sixes ?? 0}·6s`, 'Boundaries'],
                                  ]} />
                                  <SubStat title="Bowling" rows={[
                                    [`${perf.overs_bowled}`, 'Overs'],
                                    [`${perf.wickets}/${perf.runs_conceded}`, 'Wkts/Runs'],
                                    [getEconomy(perf.runs_conceded, perf.overs_bowled), 'Economy'],
                                  ]} />
                                  <SubStat title="Fielding" rows={[
                                    [`${perf.catches}`, 'Catches'],
                                    [`${perf.runout_fielder}+${perf.runout_helper}`, 'Run-outs (F/H)'],
                                    [`${perf.stumpings}`, 'Stumpings'],
                                  ]} />
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                  {perf.runs > 0 && <Chip label={`+${pts.batting_points} batting`} color="var(--accent)" />}
                                  {perf.wickets > 0 && <Chip label={`+${pts.bowling_points} bowling`} color="var(--green)" />}
                                  {pts.fielding_points > 0 && <Chip label={`+${pts.fielding_points} fielding`} color="var(--gold)" />}
                                  {perf.is_potm && <Chip label="🏅 POTM +30" color={color} />}
                                  {(perf.availability_points ?? 0) > 0 && <Chip label={`✅ AVAIL +${perf.availability_points}`} color="var(--green)" />}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Subcomponents
// ───────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-2 mb-4">
      <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
    </div>
  )
}

function StatCard({ label, value, color, large }: { label: string; value: number | string; color?: string; large?: boolean }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } } }}
      className="rounded-xl p-4 text-center"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.10)',
        gridColumn: large ? 'span 2' : undefined,
      }}
    >
      <div className="font-display" style={{ fontSize: large ? 40 : 26, color: color || 'var(--text)' }}>
        {value}
      </div>
      <div className="font-mono text-[10px] tracking-widest uppercase mt-1" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
    </motion.div>
  )
}

function FormGuide({ matches, perfs, color }: { matches: Match[]; perfs: MatchPerf[]; color: string }) {
  // Most recent 5 played-or-scheduled matches the team has on the books.
  const playedMatches = matches.filter(m => m.is_played).slice(-5)
  const perfByMatch = new Map<number, MatchPerf>()
  for (const p of perfs) perfByMatch.set(p.match_id, p)

  function categorize(pts: number | null) {
    if (pts === null) return { emoji: '⬜', label: 'DNP', tone: 'rgba(255,255,255,0.12)' }
    if (pts > 30) return { emoji: '🟡', label: 'Good', tone: 'rgba(245,158,11,0.5)' }
    if (pts >= 15) return { emoji: '🔵', label: 'Average', tone: 'rgba(0,229,255,0.5)' }
    return { emoji: '⚫', label: 'Poor', tone: 'rgba(255,255,255,0.2)' }
  }

  if (playedMatches.length === 0) {
    return (
      <div className="rounded-xl p-6 mb-8 font-mono text-xs tracking-widest text-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text3)' }}>
        NO PLAYED MATCHES YET
      </div>
    )
  }

  return (
    <motion.div
      className="rounded-2xl p-5 mb-8 flex items-center gap-3 flex-wrap"
      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
    >
      <div className="font-mono text-[10px] tracking-[3px] uppercase mr-2" style={{ color: 'var(--text3)' }}>
        Oldest →
      </div>
      {playedMatches.map(m => {
        const perf = perfByMatch.get(m.id)
        const pts = perf
          ? calculatePoints({
              runs: perf.runs, balls_faced: perf.balls_faced,
              overs_bowled: perf.overs_bowled, runs_conceded: perf.runs_conceded,
              wickets: perf.wickets, catches: perf.catches,
              runout_fielder: perf.runout_fielder, runout_helper: perf.runout_helper,
              stumpings: perf.stumpings, is_potm: perf.is_potm,
              availability_points: perf.availability_points ?? 0,
            }).total_points
          : null
        const cat = categorize(pts)
        return (
          <motion.div
            key={m.id}
            variants={{ hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 250, damping: 18 } } }}
            title={`Match ${m.match_number} vs ${m.opponent_short || m.opponent.split(' ')[0]}: ${pts === null ? 'Did not play' : `${pts} pts (${cat.label})`}`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${cat.tone}`,
              minWidth: 80,
            }}
          >
            <span style={{ fontSize: 18 }}>{cat.emoji}</span>
            <div>
              <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>M{m.match_number}</div>
              <div className="font-mono text-xs" style={{ color: pts === null ? 'var(--text3)' : 'var(--text)' }}>
                {pts === null ? '—' : `${pts}p`}
              </div>
            </div>
          </motion.div>
        )
      })}
      <div className="font-mono text-[10px] tracking-[3px] uppercase ml-2" style={{ color }}>
        → Newest
      </div>
    </motion.div>
  )
}

function Milestone({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 100
  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}>
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
          {label}
        </div>
        <div className="font-mono text-[11px]" style={{ color: 'var(--text2)' }}>
          {value} / {target}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="h-full"
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
      <div className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--text3)' }}>
        {value >= target ? `Cleared! Next milestone updating soon.` : `${target - value} to next milestone`}
      </div>
    </div>
  )
}

function SubStat({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
      <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>
        {title}
      </div>
      {rows.map(([val, lbl], i) => (
        <div key={i} className="flex justify-between text-xs py-0.5">
          <span style={{ color: 'var(--text3)' }}>{lbl}</span>
          <span className="font-mono" style={{ color: 'var(--text)' }}>{val}</span>
        </div>
      ))}
    </div>
  )
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-2.5 py-1 rounded-lg font-mono text-xs"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}33`,
        color,
      }}>
      {label}
    </span>
  )
}

function Loader({ color }: { color: string }) {
  return (
    <div className="text-center py-32">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          border: '2px solid var(--border2)', borderTop: `2px solid ${color}`,
          margin: '0 auto 20px',
        }}
      />
      <div className="font-display text-2xl tracking-[6px]" style={{ color: 'var(--border2)' }}>
        LOADING
      </div>
    </div>
  )
}

function nextMilestone(current: number, targets: number[]): number {
  for (const t of targets) {
    if (current < t) return t
  }
  return targets[targets.length - 1]
}
