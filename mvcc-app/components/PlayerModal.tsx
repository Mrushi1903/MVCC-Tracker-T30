'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          maxHeight: '92vh', overflowY: 'auto',
          animation: 'fadeInUp 0.25s ease',
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${borderColor}`,
        }}
      >
        {/* Top accent line */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }} />

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="p-6 pb-4 relative" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>

          {/* Background glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 60% 80% at ${isMM ? '0%' : '100%'} 50%, ${glowColor}, transparent)`,
          }} />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">

              {/* Player photo or initial */}
              <div style={{
                width: 72, height: 72, borderRadius: 16,
                overflow: 'hidden',
                border: `2px solid ${borderColor}`,
                flexShrink: 0,
                boxShadow: `0 4px 20px ${glowColor}`,
              }}>
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
              </div>

              <div>
                <div className="font-display text-3xl leading-none" style={{ color: 'var(--text)' }}>
                  {player.short_name.toUpperCase()}
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
              </div>
            </div>

            {/* Close */}
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all text-lg flex-shrink-0"
              style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer' }}>
              ✕
            </button>
          </div>

          {/* Total points */}
          <div className="mt-5 flex items-baseline gap-2">
            <span className={`font-display ${isMM ? 'gold-shimmer' : ''}`}
              style={isMM ? { fontSize: 64 } : { fontSize: 64, color }}>
              {player.total_points}
            </span>
            <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
              TOTAL POINTS
            </span>
          </div>
        </div>

        {/* ── STATS GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'MATCHES',   value: player.matches_played },
            { label: 'RUNS',      value: totalRuns },
            { label: 'WICKETS',   value: totalWickets },
            { label: 'CATCHES',   value: totalCatches },
            { label: 'TOP SCORE', value: topScore },
          ].map((stat, i) => (
            <div key={stat.label} className="p-4 text-center"
              style={{ borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <div className="font-display text-2xl" style={{ color: 'var(--text)' }}>{stat.value}</div>
              <div className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'var(--text3)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── MATCH BREAKDOWN ─────────────────────────────── */}
        <div className="p-5">
          <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>
            Match Breakdown
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '2px solid var(--border2)', borderTop: `2px solid ${color}`,
                animation: 'rotateSlow 1s linear infinite', margin: '0 auto 12px',
              }} />
              <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>LOADING...</p>
            </div>
          ) : perfs.length === 0 ? (
            <div className="text-center py-10 rounded-xl"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <div className="text-3xl mb-2">🏏</div>
              <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>NO MATCHES PLAYED YET</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {perfs.map(perf => (
                <div key={perf.id} className="rounded-xl p-4"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>

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
                      <div className="font-display text-3xl" style={{ color }}>{perf.total_points}</div>
                      <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>PTS</div>
                    </div>
                  </div>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-2">
                    {perf.runs > 0 && <Chip label={`${perf.runs} runs`} sub={`+${perf.batting_points}pts`} color="var(--text2)" />}
                    {perf.wickets > 0 && <Chip label={`${perf.wickets} wkts`} sub={`+${perf.bowling_points}pts`} color="var(--green)" />}
                    {perf.catches > 0 && <Chip label={`${perf.catches} catch`} sub={`+${perf.catches * 10}pts`} color="var(--gold)" />}
                    {perf.runout_fielder > 0 && <Chip label={`${perf.runout_fielder} RO`} sub="+10pts" color="var(--gold)" />}
                    {perf.stumpings > 0 && <Chip label={`${perf.stumpings} stump`} sub={`+${perf.stumpings * 10}pts`} color="var(--gold)" />}
                    {perf.is_potm && <Chip label="🏅 POTM" sub="+30pts" color="var(--mm)" />}
                    {perf.bonus_points > (perf.is_potm ? 30 : 0) && (
                      <Chip label="⭐ BONUS" sub={`+${perf.bonus_points}pts`} color="var(--gold)" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{ background: 'var(--bg4)', border: '1px solid var(--border2)' }}>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
      <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{sub}</span>
    </div>
  )
}
