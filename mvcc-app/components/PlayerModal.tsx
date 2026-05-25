'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase, Performance, Match } from '@/lib/supabase'
import { getPlayerImage } from '@/lib/playerImages'

type Player = {
  id: number
  name: string
  short_name: string
  team: 'MM' | 'HB'
  jersey_number: number
  total_points: number
  total_runs: number
  total_wickets: number
  total_catches: number
  matches_played: number
  is_external?: boolean
}

type MatchPerf = Performance & { match: Match }

export default function PlayerModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const [perfs,   setPerfs]   = useState<MatchPerf[]>([])
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    fetchPerfs()
    setImgError(false)
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [player.id])

  async function fetchPerfs() {
    setLoading(true)
    const { data } = await supabase
      .from('performances')
      .select('*, match:matches(*)')
      .eq('player_id', player.id)
      .order('match_id', { ascending: true })
    if (data) setPerfs(data as MatchPerf[])
    setLoading(false)
  }

  const isMM      = player.team === 'MM'
  const color     = isMM ? 'var(--mm)' : 'var(--hb)'
  const dimColor  = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
  const borderColor = isMM ? 'var(--mm-border)' : 'var(--hb-border)'
  const glowColor = isMM ? 'rgba(201,168,76,0.15)' : 'rgba(59,130,246,0.15)'

  const totalRuns    = perfs.reduce((s, p) => s + p.runs, 0)
  const totalWickets = perfs.reduce((s, p) => s + p.wickets, 0)
  const totalCatches = perfs.reduce((s, p) => s + p.catches, 0)
  const topScore     = perfs.length > 0 ? Math.max(...perfs.map(p => p.runs)) : 0

  const imgSrc = getPlayerImage(player.short_name)

  return (
    <motion.div
      className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{
        zIndex: 200, // above mobile bottom nav (z=100)
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
        className="w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl overflow-hidden modal-panel relative"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
        style={{
          background: 'rgba(15, 21, 40, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${borderColor}`,
          // Mobile: clear the bottom nav (~80px). Desktop: cap at 88vh.
          maxHeight: 'min(88dvh, calc(100dvh - 96px))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top accent line — sits inside the panel */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          flexShrink: 0,
        }} />

        {/* ── STICKY HEADER ─────────────────────────────── */}
        <div
          className="p-6 pb-4 relative"
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
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 60% 80% at ${isMM ? '0%' : '100%'} 50%, ${glowColor}, transparent)`,
          }} />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 240, damping: 18 }}
                style={{
                  width: 72, height: 72, borderRadius: 16,
                  overflow: 'hidden',
                  border: `2px solid ${borderColor}`,
                  flexShrink: 0,
                  boxShadow: `0 4px 20px ${glowColor}`,
                }}
              >
                {imgSrc && !imgError ? (
                  <Image
                    src={imgSrc}
                    alt={player.short_name}
                    width={72} height={72}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: dimColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Bebas Neue', cursive", fontSize: 32, color,
                  }}>
                    {player.short_name.charAt(0)}
                  </div>
                )}
              </motion.div>

              <div>
                <div className="font-display text-3xl leading-none flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  {player.short_name.toUpperCase()}
                  {player.is_external && (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.15em',
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: 'rgba(245,158,11,0.12)',
                        color: 'var(--gold)',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}
                    >
                      EXT
                    </span>
                  )}
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
                  {player.name}
                </div>
                <div className="font-mono text-xs tracking-widest mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full"
                  style={{ background: dimColor, color, border: `1px solid ${borderColor}` }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {player.team === 'MM' ? 'MIGHTY MAVERICKS' : 'HELL BOYS'}
                  {player.jersey_number > 0 && ` · #${player.jersey_number}`}
                </div>
                {player.is_external && (
                  <div className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--gold)' }}>
                    External player — points don&apos;t count toward team total
                  </div>
                )}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-lg flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer' }}
            >
              ✕
            </motion.button>
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-display"
              style={{ fontSize: 64, color, textShadow: `0 0 30px ${glowColor}` }}>
              {player.total_points}
            </span>
            <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
              TOTAL POINTS
            </span>
          </div>
        </div>

        {/* ── STATS GRID (still in sticky region) ─────── */}
        <motion.div
          className="grid grid-cols-5 gap-0"
          style={{
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            background: 'rgba(20, 28, 53, 0.6)',
          }}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } }}
        >
          {[
            { label: 'MATCHES',   value: player.matches_played },
            { label: 'RUNS',      value: totalRuns },
            { label: 'WICKETS',   value: totalWickets },
            { label: 'CATCHES',   value: totalCatches },
            { label: 'TOP SCORE', value: topScore },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="p-4 text-center"
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
              }}
              style={{ borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="font-display text-2xl" style={{ color: 'var(--text)' }}>{stat.value}</div>
              <div className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'var(--text3)' }}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── SCROLLABLE MATCH BREAKDOWN ────────────── */}
        <div
          className="p-5 relative"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>
            Match Breakdown
          </div>

          {loading ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '2px solid var(--border2)', borderTop: `2px solid ${color}`,
                  margin: '0 auto 12px',
                }}
              />
              <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>LOADING...</p>
            </div>
          ) : perfs.length === 0 ? (
            <div className="text-center py-10 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
              <div className="text-3xl mb-2">🏏</div>
              <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>NO MATCHES PLAYED YET</p>
            </div>
          ) : (
            <motion.div
              className="flex flex-col gap-3 pb-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
            >
              {perfs.map(perf => (
                <motion.div
                  key={perf.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
                  }}
                  className="rounded-xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                        Match {perf.match?.match_number} ·{' '}
                        {(() => {
                          const [y, mo, d] = (perf.match?.date || '').split('-').map(Number)
                          return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        })()}
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
                    <div className="text-right">
                      <div className="font-display text-3xl" style={{ color, textShadow: `0 0 16px ${glowColor}` }}>{perf.total_points}</div>
                      <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>PTS</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {perf.runs > 0 && <Chip label={`${perf.runs} runs`} sub={`+${perf.batting_points}pts`} color="var(--accent)" />}
                    {perf.wickets > 0 && <Chip label={`${perf.wickets} wkts`} sub={`+${perf.bowling_points}pts`} color="var(--green)" />}
                    {perf.catches > 0 && <Chip label={`${perf.catches} catch`} sub={`+${perf.catches * 10}pts`} color="var(--gold)" />}
                    {perf.runout_fielder > 0 && <Chip label={`${perf.runout_fielder} RO`} sub="+10pts" color="var(--gold)" />}
                    {perf.stumpings > 0 && <Chip label={`${perf.stumpings} stump`} sub={`+${perf.stumpings * 10}pts`} color="var(--gold)" />}
                    {perf.is_potm && <Chip label="🏅 POTM" sub="+30pts" color="var(--mm)" />}
                    {perf.availability_points > 0 && <Chip label="✅ AVAIL" sub={`+${perf.availability_points}pts`} color="var(--green)" />}
                    {perf.bonus_points > ((perf.is_potm ? 30 : 0) + (perf.availability_points || 0)) && (
                      <Chip label="⭐ BONUS" sub={`+${perf.bonus_points - (perf.is_potm ? 30 : 0) - (perf.availability_points || 0)}pts`} color="var(--gold)" />
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Full profile CTA */}
          <Link
            href={`/t30/player/${player.short_name.toLowerCase()}`}
            onClick={onClose}
            className="mt-5 mb-2 block w-full text-center py-3 rounded-xl font-mono text-xs tracking-[3px] uppercase"
            style={{
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
              boxShadow: '0 0 18px rgba(0,229,255,0.15)',
              transition: 'background 200ms ease, box-shadow 200ms ease',
            }}
          >
            View Full Profile →
          </Link>

          {/* Fade hint at bottom showing scroll continues */}
          <div
            aria-hidden
            style={{
              position: 'sticky',
              bottom: -20,
              left: 0,
              right: 0,
              height: 32,
              marginTop: -32,
              pointerEvents: 'none',
              background: 'linear-gradient(180deg, transparent, rgba(15,21,40,0.95))',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Chip({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}33`,
        boxShadow: `inset 0 0 8px ${color}10`,
      }}>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
      <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{sub}</span>
    </div>
  )
}
