'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  supabase,
  Match, Performance, Player,
  OpponentBatting, OpponentBowling,
  FallOfWicket, MatchExtras,
} from '@/lib/supabase'
import { getPlayerImage } from '@/lib/playerImages'
import { formatDismissal } from '@/lib/parseCSV'

type FullPerf = Performance & { player: Player }
type Innings = 'mvcc' | 'opponent' | 'summary'

function getStrikeRate(runs: number, balls: number) {
  if (!balls) return '—'
  return ((runs / balls) * 100).toFixed(0)
}
function getEconomy(runs: number, overs: number) {
  if (!overs) return '—'
  return (runs / overs).toFixed(2)
}
function formatOvers(o: number) {
  const full = Math.floor(o)
  const balls = Math.round((o - full) * 10)
  return balls > 0 ? `${full}.${balls}` : `${full}.0`
}

function PlayerAvatar({ shortName, size = 32 }: { shortName: string; size?: number }) {
  const src = getPlayerImage(shortName)
  const [err, setErr] = useState(false)
  if (src && !err) {
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.25, overflow: 'hidden', flexShrink: 0 }}>
        <Image src={src} alt={shortName} width={size} height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setErr(true)} />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bebas Neue', cursive", fontSize: size * 0.45,
      color: 'var(--mm)', flexShrink: 0,
    }}>
      {shortName?.charAt(0) ?? '?'}
    </div>
  )
}

export default function ScorecardModal({ match, onClose }: { match: Match; onClose: () => void }) {
  const [mvccPerfs, setMvccPerfs] = useState<FullPerf[]>([])
  const [oppBatting, setOppBatting] = useState<OpponentBatting[]>([])
  const [oppBowling, setOppBowling] = useState<OpponentBowling[]>([])
  const [fow, setFow] = useState<FallOfWicket[]>([])
  const [extras, setExtras] = useState<MatchExtras[]>([])
  const [loading, setLoading] = useState(true)
  const [innings, setInnings] = useState<Innings>('mvcc')
  const [fowOpen, setFowOpen] = useState(false)

  useEffect(() => {
    loadScorecard()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [match.id])

  async function loadScorecard() {
    setLoading(true)
    const [perfRes, oppBatRes, oppBowRes, fowRes, extrasRes] = await Promise.all([
      supabase.from('performances').select('*, player:players(*)').eq('match_id', match.id).order('total_points', { ascending: false }),
      supabase.from('opponent_batting').select('*').eq('match_id', match.id),
      supabase.from('opponent_bowling').select('*').eq('match_id', match.id),
      supabase.from('fall_of_wickets').select('*').eq('match_id', match.id).order('wicket_number'),
      supabase.from('match_extras').select('*').eq('match_id', match.id),
    ])
    if (perfRes.data)   setMvccPerfs(perfRes.data as FullPerf[])
    if (oppBatRes.data) setOppBatting(oppBatRes.data as OpponentBatting[])
    if (oppBowRes.data) setOppBowling(oppBowRes.data as OpponentBowling[])
    if (fowRes.data)    setFow(fowRes.data as FallOfWicket[])
    if (extrasRes.data) setExtras(extrasRes.data as MatchExtras[])
    setLoading(false)
  }

  const [y, mo, d] = match.date.split('-').map(Number)
  const dateStr = new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const resultColor = match.result === 'won' ? 'var(--green)' : match.result === 'lost' ? 'var(--red)' : 'var(--gold)'
  const resultLabel = match.result === 'won' ? '🏆 MVCC WON' : match.result === 'lost' ? '❌ MVCC LOST' : match.result === 'tied' ? '🤝 TIED' : 'PLAYED'

  const mvccBatsmen   = useMemo(() => mvccPerfs.filter(p => p.runs > 0 || p.balls_faced > 0 || p.how_out).slice().sort((a, b) => b.runs - a.runs), [mvccPerfs])
  const mvccBowlers   = useMemo(() => mvccPerfs.filter(p => p.overs_bowled >= 1).slice().sort((a, b) => b.wickets - a.wickets || a.runs_conceded - b.runs_conceded), [mvccPerfs])
  const mvccFielding  = useMemo(() => mvccPerfs.filter(p => p.catches > 0 || p.stumpings > 0 || p.runout_fielder > 0), [mvccPerfs])
  const oppBatsmen    = useMemo(() => [...oppBatting].sort((a, b) => b.runs - a.runs), [oppBatting])
  const oppBowlers    = useMemo(() => [...oppBowling].sort((a, b) => b.wickets - a.wickets || a.runs_conceded - b.runs_conceded), [oppBowling])

  const mvccExtras    = extras.find(e => e.innings === 'mvcc') ?? null
  const oppExtras     = extras.find(e => e.innings === 'opponent') ?? null
  const mvccFow       = fow.filter(f => f.innings === 'mvcc')
  const oppFow        = fow.filter(f => f.innings === 'opponent')

  // POTM
  const potm = mvccPerfs.find(p => p.is_potm) ?? null

  // Top performers per innings
  const mvccTopBatter = mvccBatsmen[0] ?? null
  const mvccTopBowler = mvccBowlers[0] ?? null
  const oppTopBatter  = oppBatsmen[0] ?? null
  const oppTopBowler  = oppBowlers[0] ?? null

  // Margin description for summary
  const marginText = useMemo(() => {
    if (!match.result || match.result === 'no_result') return 'No result recorded.'
    const winner = match.result === 'won' ? 'MVCC' : (match.opponent_short || match.opponent.split(' ')[0])
    return `${winner} won this fixture.`
  }, [match])

  return (
    <motion.div
      className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{
        zIndex: 200,
        background: 'rgba(5,8,15,0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="w-full md:max-w-3xl rounded-t-2xl md:rounded-2xl overflow-hidden modal-panel relative"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
        style={{
          background: 'rgba(15, 21, 40, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          maxHeight: 'min(92dvh, calc(100dvh - 80px))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Accent line */}
        <div style={{
          height: 3, flexShrink: 0,
          background: `linear-gradient(90deg, var(--mm), transparent 50%, ${match.result === 'won' ? 'var(--green)' : match.result === 'lost' ? 'var(--red)' : 'var(--gold)'})`,
        }} />

        {/* ── STICKY HEADER ─────────────────────────── */}
        <div
          className="p-5 pb-4"
          style={{
            background: 'rgba(20, 28, 53, 0.92)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono text-xs tracking-[3px] uppercase mb-1" style={{ color: 'var(--text3)' }}>
                T30 2026 · Match {match.match_number} · {dateStr}
              </div>
              <div className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>
                MVCC <span style={{ color: 'var(--text3)' }}>vs</span> {match.opponent}
              </div>
              <div className="font-mono text-xs mt-1" style={{ color: 'var(--text3)' }}>
                📍 {match.ground}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer' }}
            >
              ✕
            </motion.button>
          </div>

          <div className="grid grid-cols-3 gap-3 items-center">
            <div className="text-left">
              <div className="font-mono text-xs tracking-widest mb-1" style={{ color: 'var(--mm)', opacity: 0.85 }}>MVCC</div>
              <div className="font-display text-4xl" style={{ color: 'var(--mm)', textShadow: '0 0 18px rgba(201,168,76,0.35)' }}>
                {match.mvcc_score || '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-sm tracking-widest px-3 py-1.5 rounded-full inline-block"
                style={{ color: resultColor, background: `${resultColor}15`, border: `1px solid ${resultColor}30` }}>
                {resultLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs tracking-widest mb-1" style={{ color: 'var(--hb)', opacity: 0.85 }}>
                {match.opponent_short || match.opponent.split(' ').slice(0, 2).join(' ')}
              </div>
              <div className="font-display text-4xl" style={{ color: 'var(--hb)', textShadow: '0 0 18px rgba(56,189,248,0.35)' }}>
                {match.opponent_score || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS with sliding indicator ───────────── */}
        <div
          className="flex relative"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'rgba(15, 21, 40, 0.85)',
            flexShrink: 0,
            zIndex: 2,
          }}
        >
          {([
            { key: 'mvcc' as Innings,     label: '🟡 MVCC' },
            { key: 'opponent' as Innings, label: '🔵 Opponent' },
            { key: 'summary' as Innings,  label: '📊 Summary' },
          ]).map(tab => {
            const active = innings === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setInnings(tab.key)}
                className="relative flex-1 py-3 font-mono text-xs tracking-widest uppercase"
                style={{
                  color: active ? 'var(--text)' : 'var(--text3)',
                  cursor: 'pointer',
                  transition: 'color 200ms ease',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="scorecard-tab"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 12,
                      right: 12,
                      height: 2,
                      borderRadius: 99,
                      background: 'linear-gradient(90deg, var(--mm), var(--hb))',
                      boxShadow: '0 0 10px rgba(201,168,76,0.5)',
                    }}
                  />
                )}
                <span style={{ position: 'relative' }}>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── BODY ───────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {loading ? (
            <div className="text-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '2px solid var(--border2)', borderTop: '2px solid var(--mm)',
                  margin: '0 auto 12px',
                }}
              />
              <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>LOADING SCORECARD…</div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {innings === 'mvcc' && (
                <motion.div
                  key="mvcc"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="p-5"
                >
                  <KeyPerformers topBatter={mvccTopBatter} topBowler={mvccTopBowler} side="mvcc" />

                  <BattingTable
                    title="MVCC Batting"
                    teamColor="var(--mm)"
                    rows={mvccBatsmen.map(p => ({
                      key: String(p.id),
                      avatarShort: p.player?.short_name,
                      name: p.player?.short_name ?? '—',
                      dismissal: formatDismissal(p.how_out, p.fielder, p.bowler_name),
                      isPotm: p.is_potm,
                      runs: p.runs, balls: p.balls_faced, fours: p.fours, sixes: p.sixes,
                      pts: p.batting_points,
                    }))}
                    extras={mvccExtras}
                    scoreString={match.mvcc_score}
                  />

                  <FowSection fow={mvccFow} teamColor="var(--mm)" open={fowOpen} setOpen={setFowOpen} />

                  <BowlingTable
                    title="Opponent Bowling"
                    rows={oppBowlers.map(b => ({
                      key: String(b.id),
                      name: b.player_name,
                      overs: b.overs, maidens: b.maidens, runs: b.runs_conceded,
                      wickets: b.wickets, wides: b.wides ?? 0, no_balls: b.no_balls ?? 0, dot_balls: b.dot_balls ?? 0,
                    }))}
                  />

                  {mvccFielding.length > 0 && (
                    <FieldingChips
                      rows={mvccFielding.map(p => ({
                        key: String(p.id),
                        avatarShort: p.player?.short_name,
                        name: p.player?.short_name ?? '—',
                        catches: p.catches, stumpings: p.stumpings, runouts: p.runout_fielder,
                      }))}
                    />
                  )}
                </motion.div>
              )}

              {innings === 'opponent' && (
                <motion.div
                  key="opponent"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="p-5"
                >
                  <KeyPerformers topBatter={oppTopBatter} topBowler={oppTopBowler} side="opponent" />

                  <BattingTable
                    title={`${match.opponent_short || 'Opponent'} Batting`}
                    teamColor="var(--hb)"
                    rows={oppBatsmen.map(b => ({
                      key: String(b.id),
                      avatarShort: undefined,
                      name: b.player_name,
                      dismissal: formatDismissal(b.how_out, b.fielder, b.bowler_name),
                      isPotm: false,
                      runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes,
                      pts: null,
                    }))}
                    extras={oppExtras}
                    scoreString={match.opponent_score}
                  />

                  <FowSection fow={oppFow} teamColor="var(--hb)" open={fowOpen} setOpen={setFowOpen} />

                  <BowlingTable
                    title="MVCC Bowling"
                    rows={mvccBowlers.map(p => ({
                      key: String(p.id),
                      name: p.player?.short_name ?? '—',
                      overs: p.overs_bowled, maidens: p.maidens, runs: p.runs_conceded,
                      wickets: p.wickets, wides: p.wides ?? 0, no_balls: p.no_balls ?? 0, dot_balls: p.dot_balls ?? 0,
                    }))}
                  />
                </motion.div>
              )}

              {innings === 'summary' && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="p-5 flex flex-col gap-5"
                >
                  <div className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                    <div className="font-mono text-xs tracking-[3px] uppercase mb-2" style={{ color: 'var(--text3)' }}>
                      Result
                    </div>
                    <div className="font-display text-2xl tracking-wider mb-1" style={{ color: resultColor }}>
                      {resultLabel}
                    </div>
                    <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                      {marginText}
                    </div>
                  </div>

                  {potm && potm.player && (
                    <div className="rounded-2xl p-5 flex items-center gap-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
                        border: '1px solid rgba(201,168,76,0.35)',
                        boxShadow: '0 0 24px rgba(201,168,76,0.18)',
                      }}>
                      <PlayerAvatar shortName={potm.player.short_name} size={56} />
                      <div className="flex-1">
                        <div className="font-mono text-[10px] tracking-[3px] uppercase mb-1" style={{ color: 'var(--mm)' }}>
                          🏅 Player of the Match
                        </div>
                        <div className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>
                          {potm.player.short_name.toUpperCase()}
                        </div>
                        <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                          {potm.runs > 0 && `${potm.runs}(${potm.balls_faced})`}
                          {potm.runs > 0 && potm.wickets > 0 && ' · '}
                          {potm.wickets > 0 && `${potm.wickets}/${potm.runs_conceded} in ${formatOvers(potm.overs_bowled)}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-3xl" style={{ color: 'var(--mm)' }}>{potm.total_points}</div>
                        <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text3)' }}>PTS</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mvccTopBatter && (
                      <SummaryStatCard
                        label="MVCC Top Batter"
                        primary={`${mvccTopBatter.player?.short_name ?? '—'} · ${mvccTopBatter.runs}(${mvccTopBatter.balls_faced})`}
                        secondary={`SR ${getStrikeRate(mvccTopBatter.runs, mvccTopBatter.balls_faced)}`}
                        color="var(--mm)"
                      />
                    )}
                    {mvccTopBowler && (
                      <SummaryStatCard
                        label="MVCC Top Bowler"
                        primary={`${mvccTopBowler.player?.short_name ?? '—'} · ${mvccTopBowler.wickets}/${mvccTopBowler.runs_conceded}`}
                        secondary={`${formatOvers(mvccTopBowler.overs_bowled)} ov · Econ ${getEconomy(mvccTopBowler.runs_conceded, mvccTopBowler.overs_bowled)}`}
                        color="var(--mm)"
                      />
                    )}
                    {oppTopBatter && (
                      <SummaryStatCard
                        label="Opponent Top Batter"
                        primary={`${oppTopBatter.player_name} · ${oppTopBatter.runs}(${oppTopBatter.balls})`}
                        secondary={`SR ${getStrikeRate(oppTopBatter.runs, oppTopBatter.balls)}`}
                        color="var(--hb)"
                      />
                    )}
                    {oppTopBowler && (
                      <SummaryStatCard
                        label="Opponent Top Bowler"
                        primary={`${oppTopBowler.player_name} · ${oppTopBowler.wickets}/${oppTopBowler.runs_conceded}`}
                        secondary={`${formatOvers(oppTopBowler.overs)} ov · Econ ${getEconomy(oppTopBowler.runs_conceded, oppTopBowler.overs)}`}
                        color="var(--hb)"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── KEY PERFORMERS ──────────────────────────────────────
function KeyPerformers({ topBatter, topBowler, side }: {
  topBatter: (FullPerf | OpponentBatting) | null
  topBowler: (FullPerf | OpponentBowling) | null
  side: 'mvcc' | 'opponent'
}) {
  if (!topBatter && !topBowler) return null
  const color = side === 'mvcc' ? 'var(--mm)' : 'var(--hb)'
  const borderC = side === 'mvcc' ? 'rgba(201,168,76,0.35)' : 'rgba(56,189,248,0.35)'

  const bRuns  = topBatter ? ('runs' in topBatter ? topBatter.runs : 0) : 0
  const bBalls = topBatter ? ('balls_faced' in topBatter ? topBatter.balls_faced : ('balls' in topBatter ? topBatter.balls : 0)) : 0
  const bName  = topBatter ? ('player' in topBatter ? (topBatter.player?.short_name ?? '—') : topBatter.player_name) : ''

  const wWkts  = topBowler ? topBowler.wickets : 0
  const wRuns  = topBowler ? ('runs_conceded' in topBowler ? topBowler.runs_conceded : 0) : 0
  const wOvers = topBowler ? ('overs_bowled' in topBowler ? topBowler.overs_bowled : ('overs' in topBowler ? topBowler.overs : 0)) : 0
  const wName  = topBowler ? ('player' in topBowler ? (topBowler.player?.short_name ?? '—') : topBowler.player_name) : ''

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
    >
      {topBatter && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 22 } } }}
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderC}`, boxShadow: `0 0 18px ${color}20` }}
        >
          <div className="font-mono text-[10px] tracking-[3px] uppercase mb-1.5" style={{ color }}>
            ★ Top Batter
          </div>
          <div className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>{bName}</div>
          <div className="font-mono text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            {bRuns}({bBalls}) · SR {getStrikeRate(bRuns, bBalls)}
          </div>
        </motion.div>
      )}
      {topBowler && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 22 } } }}
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderC}`, boxShadow: `0 0 18px ${color}20` }}
        >
          <div className="font-mono text-[10px] tracking-[3px] uppercase mb-1.5" style={{ color }}>
            ★ Top Bowler
          </div>
          <div className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>{wName}</div>
          <div className="font-mono text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            {wWkts}/{wRuns} in {formatOvers(wOvers)} · Econ {getEconomy(wRuns, wOvers)}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ── BATTING TABLE ───────────────────────────────────────
function BattingTable({ title, teamColor, rows, extras, scoreString }: {
  title: string
  teamColor: string
  rows: Array<{
    key: string; avatarShort?: string; name: string; dismissal: string; isPotm: boolean
    runs: number; balls: number; fours: number; sixes: number; pts: number | null
  }>
  extras: MatchExtras | null
  scoreString: string | null
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-6 rounded-xl font-mono text-xs mb-5"
        style={{ color: 'var(--text3)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        No batting data
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
      <div className="px-3 py-2 font-mono text-xs tracking-[3px] uppercase flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: teamColor, display: 'inline-block' }} />
        {title}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid font-mono text-[10px] tracking-widest uppercase px-3 py-2 sticky top-0"
          style={{
            gridTemplateColumns: 'minmax(140px, 1.6fr) 44px 40px 36px 36px 48px',
            color: 'var(--text3)',
            background: 'rgba(20, 28, 53, 0.95)',
            borderBottom: '1px solid var(--border)',
            minWidth: 480,
          }}
        >
          <span>Batsman</span>
          <span className="text-right">R</span>
          <span className="text-right">B</span>
          <span className="text-right">4s</span>
          <span className="text-right">6s</span>
          <span className="text-right">SR</span>
        </div>

        <motion.div initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
          {rows.map((r, i) => {
            const sr = parseFloat(getStrikeRate(r.runs, r.balls))
            const srHot = !isNaN(sr) && sr > 150
            return (
              <motion.div
                key={r.key}
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } } }}
                className="grid items-center px-3 py-2.5"
                style={{
                  gridTemplateColumns: 'minmax(140px, 1.6fr) 44px 40px 36px 36px 48px',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                  minWidth: 480,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {r.avatarShort && <PlayerAvatar shortName={r.avatarShort} size={28} />}
                  <div className="min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      <span className="truncate">{r.name}</span>
                      {r.isPotm && <span className="text-xs">🏅</span>}
                    </div>
                    <div className="font-mono text-[10px] truncate" style={{ color: 'var(--text3)' }}>
                      {r.dismissal}
                    </div>
                  </div>
                </div>
                <div className="font-display text-lg text-right" style={{ color: r.runs >= 30 ? teamColor : 'var(--text)' }}>{r.runs}</div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{r.balls}</div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{r.fours}</div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{r.sixes}</div>
                <div className="font-mono text-xs text-right" style={{ color: srHot ? 'var(--green)' : 'var(--text3)' }}>
                  {getStrikeRate(r.runs, r.balls)}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {extras && extras.total_extras > 0 && (
        <div className="px-3 py-2 font-mono text-xs flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ color: 'var(--text3)' }}>Extras</span>
          <span style={{ color: 'var(--text2)' }}>
            {extras.total_extras} (b {extras.byes}, lb {extras.leg_byes}, w {extras.wides}, nb {extras.no_balls}{extras.penalty ? `, p ${extras.penalty}` : ''})
          </span>
        </div>
      )}
      {scoreString && (
        <div className="px-3 py-2 font-mono text-xs flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: 'var(--text3)' }}>Total</span>
          <span className="font-display text-base" style={{ color: teamColor }}>{scoreString}</span>
        </div>
      )}
    </div>
  )
}

// ── FALL OF WICKETS ───────────────────────────────────
function FowSection({ fow, teamColor, open, setOpen }: { fow: FallOfWicket[]; teamColor: string; open: boolean; setOpen: (v: boolean) => void }) {
  if (fow.length === 0) return null
  return (
    <div className="mb-5 rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center justify-between"
        style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
      >
        <span className="font-mono text-xs tracking-[3px] uppercase flex items-center gap-2" style={{ color: 'var(--text3)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: teamColor, display: 'inline-block' }} />
          Fall of Wickets · {fow.length}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ color: 'var(--text3)' }}>▾</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              className="px-3 py-2 flex gap-2 overflow-x-auto"
              style={{ borderTop: '1px solid var(--border)' }}
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            >
              {fow.map(f => (
                <motion.div
                  key={f.id}
                  variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } } }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-xs"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border2)',
                    color: 'var(--text)',
                  }}
                >
                  <span style={{ color: teamColor }}>{f.wicket_number}-{f.score}</span>
                  <span style={{ color: 'var(--text3)' }}> · {f.batsman_name ?? '—'} ({f.over_number ?? '?'})</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── BOWLING TABLE ─────────────────────────────────────
function BowlingTable({ title, rows }: {
  title: string
  rows: Array<{ key: string; name: string; overs: number; maidens: number; runs: number; wickets: number; wides: number; no_balls: number; dot_balls: number }>
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-6 rounded-xl font-mono text-xs mb-5"
        style={{ color: 'var(--text3)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        No bowling data
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
      <div className="px-3 py-2 font-mono text-xs tracking-[3px] uppercase flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hb)', display: 'inline-block' }} />
        {title}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid font-mono text-[10px] tracking-widest uppercase px-3 py-2"
          style={{
            gridTemplateColumns: 'minmax(120px,1.4fr) 48px 36px 44px 44px 36px 36px 56px',
            color: 'var(--text3)', background: 'rgba(20,28,53,0.95)', borderBottom: '1px solid var(--border)',
            minWidth: 520,
          }}
        >
          <span>Bowler</span>
          <span className="text-right">O</span>
          <span className="text-right">M</span>
          <span className="text-right">R</span>
          <span className="text-right">W</span>
          <span className="text-right">WD</span>
          <span className="text-right">NB</span>
          <span className="text-right">Eco</span>
        </div>

        <motion.div initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
          {rows.map((r, i) => {
            const econ = parseFloat(getEconomy(r.runs, r.overs))
            const econColor = isNaN(econ) ? 'var(--text3)' : econ < 6 ? 'var(--green)' : econ <= 8 ? 'var(--gold)' : 'var(--red)'
            return (
              <motion.div
                key={r.key}
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } } }}
                className="grid items-center px-3 py-2.5"
                style={{
                  gridTemplateColumns: 'minmax(120px,1.4fr) 48px 36px 44px 44px 36px 36px 56px',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                  minWidth: 520,
                }}
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{r.name}</div>
                  {r.dot_balls > 0 && (
                    <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>{r.dot_balls} dots</div>
                  )}
                </div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{formatOvers(r.overs)}</div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{r.maidens}</div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{r.runs}</div>
                <div className="font-display text-lg text-right" style={{ color: r.wickets > 0 ? 'var(--green)' : 'var(--text)' }}>{r.wickets}</div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{r.wides}</div>
                <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{r.no_balls}</div>
                <div className="font-mono text-xs text-right" style={{ color: econColor }}>{getEconomy(r.runs, r.overs)}</div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

// ── FIELDING ─────────────────────────────────────────
function FieldingChips({ rows }: { rows: Array<{ key: string; avatarShort?: string; name: string; catches: number; stumpings: number; runouts: number }> }) {
  return (
    <div>
      <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center gap-2" style={{ color: 'var(--text3)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
        Fielding
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map(r => (
          <div key={r.key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
            {r.avatarShort && <PlayerAvatar shortName={r.avatarShort} size={22} />}
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{r.name}</span>
            <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
              {r.catches > 0 && `${r.catches}ct `}
              {r.stumpings > 0 && `${r.stumpings}st `}
              {r.runouts > 0 && `${r.runouts}ro`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryStatCard({ label, primary, secondary, color }: { label: string; primary: string; secondary: string; color: string }) {
  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
      <div className="font-mono text-[10px] tracking-[3px] uppercase mb-1" style={{ color }}>
        {label}
      </div>
      <div className="font-display text-lg tracking-wider" style={{ color: 'var(--text)' }}>
        {primary}
      </div>
      <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
        {secondary}
      </div>
    </div>
  )
}
