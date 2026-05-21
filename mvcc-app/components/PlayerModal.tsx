'use client'

import { useEffect, useState } from 'react'
import { supabase, Performance, Match } from '@/lib/supabase'

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

export default function PlayerModal({
  player,
  onClose,
}: {
  player: Player
  onClose: () => void
}) {
  const [perfs, setPerfs] = useState<MatchPerf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerfs()
    // close on escape
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

  const isTeamMM = player.team === 'MM'
  const color = isTeamMM ? 'var(--mm)' : 'var(--hb)'
  const dimColor = isTeamMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
  const borderColor = isTeamMM ? 'var(--mm-border)' : 'var(--hb-border)'

  const totalRuns = perfs.reduce((s, p) => s + p.runs, 0)
  const totalWickets = perfs.reduce((s, p) => s + p.wickets, 0)
  const totalCatches = perfs.reduce((s, p) => s + p.catches, 0)
  const topScore = perfs.length > 0 ? Math.max(...perfs.map((p) => p.runs)) : 0
  const bestBowling = perfs.length > 0 ? Math.max(...perfs.map((p) => p.wickets)) : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          maxHeight: '92vh',
          overflowY: 'auto',
          animation: 'fadeInUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          className="p-6 pb-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-3xl"
                style={{ background: dimColor, border: `1px solid ${borderColor}`, color }}
              >
                {player.short_name.charAt(0)}
              </div>
              <div>
                <div className="font-display text-3xl leading-none" style={{ color: 'var(--text)' }}>
                  {player.short_name.toUpperCase()}
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
                  {player.name}
                </div>
                <div
                  className="font-mono text-xs tracking-widest mt-1 inline-block px-2 py-0.5 rounded"
                  style={{ background: dimColor, color, border: `1px solid ${borderColor}` }}
                >
                  {player.team === 'MM' ? 'MIGHTY MAVERICKS' : 'HELL BOYS'}
                  {player.jersey_number > 0 && ` · #${player.jersey_number}`}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-lg"
              style={{
                background: 'var(--bg4)',
                border: '1px solid var(--border)',
                color: 'var(--text3)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {/* Total points big */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-6xl" style={{ color }}>
              {player.total_points}
            </span>
            <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
              TOTAL POINTS
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'MATCHES', value: player.matches_played },
            { label: 'RUNS', value: totalRuns },
            { label: 'WICKETS', value: totalWickets },
            { label: 'CATCHES', value: totalCatches },
            { label: 'TOP SCORE', value: topScore },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="p-4 text-center"
              style={{
                borderRight: i < 4 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="font-display text-2xl" style={{ color: 'var(--text)' }}>
                {stat.value}
              </div>
              <div className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'var(--text3)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Match by match */}
        <div className="p-5">
          <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>
            Match Breakdown
          </div>

          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--text3)' }}>
              <p className="font-mono text-xs tracking-widest">LOADING...</p>
            </div>
          ) : perfs.length === 0 ? (
            <div
              className="text-center py-10 rounded-xl"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <div className="text-3xl mb-2">🏏</div>
              <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                NO MATCHES PLAYED YET
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {perfs.map((perf) => (
                <div
                  key={perf.id}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                        Match {perf.match?.match_number} ·{' '}
                        {new Date(perf.match?.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="font-medium text-sm mt-0.5" style={{ color: 'var(--text)' }}>
                        vs {perf.match?.opponent}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-3xl" style={{ color }}>
                        {perf.total_points}
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>
                        PTS
                      </div>
                    </div>
                  </div>

                  {/* Breakdown chips */}
                  <div className="flex flex-wrap gap-2">
                    {perf.runs > 0 && (
                      <Chip label={`${perf.runs} runs`} sub={`+${perf.batting_points}pts`} color="var(--text2)" />
                    )}
                    {perf.wickets > 0 && (
                      <Chip label={`${perf.wickets} wkts`} sub={`+${perf.wicket_points || perf.wickets * 20}pts`} color="var(--green)" />
                    )}
                    {perf.catches > 0 && (
                      <Chip label={`${perf.catches} catch`} sub={`+${perf.catches * 10}pts`} color="var(--gold)" />
                    )}
                    {perf.runout_fielder > 0 && (
                      <Chip label={`${perf.runout_fielder} RO`} sub="+10pts" color="var(--gold)" />
                    )}
                    {perf.stumpings > 0 && (
                      <Chip label={`${perf.stumpings} stump`} sub={`+${perf.stumpings * 10}pts`} color="var(--gold)" />
                    )}
                    {perf.is_potm && (
                      <Chip label="🏅 POTM" sub="+30pts" color="var(--mm)" />
                    )}
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
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{ background: 'var(--bg4)', border: '1px solid var(--border2)' }}
    >
      <span className="text-xs font-medium" style={{ color }}>
        {label}
      </span>
      <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
        {sub}
      </span>
    </div>
  )
}
