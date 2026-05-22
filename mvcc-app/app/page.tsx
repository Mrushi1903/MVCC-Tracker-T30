'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import Nav from '@/components/Nav'
import TeamBanner from '@/components/TeamBanner'
import PlayerModal from '@/components/PlayerModal'

type PlayerRow = {
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

const RANK_LABELS = ['🥇', '🥈', '🥉']

export default function HomePage() {
  const [players,        setPlayers]        = useState<PlayerRow[]>([])
  const [loading,        setLoading]        = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null)
  const [filter,         setFilter]         = useState<'all' | 'MM' | 'HB'>('all')

  useEffect(() => { fetchLeaderboard() }, [])

  async function fetchLeaderboard() {
    setLoading(true)
    const { data: rawPlayers } = await supabase.from('players').select('*').order('team').order('name')
    if (!rawPlayers) { setLoading(false); return }

    const { data: perfs } = await supabase.from('performances').select('*')

    const playerMap = new Map<number, PlayerRow>()
    for (const pl of rawPlayers) {
      playerMap.set(pl.id, {
        id: pl.id, name: pl.name, short_name: pl.short_name,
        team: pl.team, jersey_number: pl.jersey_number,
        total_points: 0, total_runs: 0, total_wickets: 0, total_catches: 0, matches_played: 0,
      })
    }

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
        })
        p.total_points += pts.total_points
        p.total_runs    += perf.runs
        p.total_wickets += perf.wickets
        p.total_catches += perf.catches
        p.matches_played += 1
      }
    }

    setPlayers(Array.from(playerMap.values()).sort((a, b) => b.total_points - a.total_points))
    setLoading(false)
  }

  const mmPlayers = players.filter(p => p.team === 'MM')
  const hbPlayers = players.filter(p => p.team === 'HB')
  const mmTotal   = mmPlayers.reduce((s, p) => s + p.total_points, 0)
  const hbTotal   = hbPlayers.reduce((s, p) => s + p.total_points, 0)
  const displayed = filter === 'all' ? players : players.filter(p => p.team === filter)

  const top3    = players.slice(0, 3)
  const rest    = displayed.filter(p => players.indexOf(p) >= 3)
  const showTop3 = filter === 'all' && !loading && top3.length > 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* ── HERO HEADER ─────────────────────────────── */}
        <div className="mb-10 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" />
            <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--green)' }}>
              Live · Season 2026
            </span>
          </div>
          <h1 className="font-display tracking-widest" style={{ fontSize: 72, lineHeight: 1, color: 'var(--text)' }}>
            STANDINGS
          </h1>
          <p className="font-mono text-sm mt-2" style={{ color: 'var(--text3)' }}>
            Mavericks Cricket Club · T30 Internal Tournament
          </p>
        </div>

        {/* ── TEAM BANNER ──────────────────────────────── */}
        <TeamBanner mmTotal={mmTotal} hbTotal={hbTotal} />

        {/* ── TOP 3 PODIUM ─────────────────────────────── */}
        {showTop3 && (
          <div className="mb-8 fade-in-2">
            <div className="font-mono text-xs tracking-[4px] uppercase mb-4" style={{ color: 'var(--text3)' }}>
              Top Performers
            </div>
            <div className="grid grid-cols-3 gap-3">
              {top3.map((player, i) => {
                const isMM    = player.team === 'MM'
                const color   = isMM ? 'var(--mm)' : 'var(--hb)'
                const dimColor = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
                const borderColor = isMM ? 'var(--mm-border)' : 'var(--hb-border)'
                const isFirst = i === 0

                return (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className="card-hover cursor-pointer rounded-2xl p-5 text-center relative overflow-hidden"
                    style={{
                      background: isFirst
                        ? 'linear-gradient(160deg, #1a1400 0%, var(--bg2) 60%)'
                        : 'var(--bg2)',
                      border: `1px solid ${isFirst ? 'var(--mm-border)' : 'var(--border)'}`,
                      marginTop: i === 1 ? 0 : i === 0 ? 0 : 12,
                    }}
                  >
                    {/* Glow for #1 */}
                    {isFirst && (
                      <div style={{
                        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                        width: '80%', height: 1,
                        background: 'linear-gradient(90deg, transparent, var(--mm), transparent)',
                      }} />
                    )}

                    {/* Rank */}
                    <div className="text-3xl mb-3">{RANK_LABELS[i]}</div>

                    {/* Avatar */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center font-display text-2xl mx-auto mb-3"
                      style={{ background: dimColor, border: `1px solid ${borderColor}`, color }}
                    >
                      {player.short_name.charAt(0)}
                    </div>

                    {/* Name */}
                    <div className="font-display text-xl tracking-wider mb-0.5" style={{ color: 'var(--text)' }}>
                      {player.short_name.toUpperCase()}
                    </div>
                    <div className="font-mono text-xs mb-3" style={{ color: 'var(--text3)' }}>
                      {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                    </div>

                    {/* Points */}
                    <div
                      className={`font-display text-4xl ${isFirst ? 'gold-shimmer' : ''}`}
                      style={isFirst ? {} : { color }}
                    >
                      {player.total_points}
                    </div>
                    <div className="font-mono text-[10px] tracking-widest mt-0.5" style={{ color: 'var(--text3)' }}>
                      PTS
                    </div>

                    {/* Mini stats */}
                    <div
                      className="flex justify-center gap-4 mt-3 pt-3"
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                      <div className="text-center">
                        <div className="font-display text-base" style={{ color: 'var(--text2)' }}>{player.total_runs}</div>
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>RUNS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-base" style={{ color: 'var(--text2)' }}>{player.total_wickets}</div>
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>WKTS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-base" style={{ color: 'var(--text2)' }}>{player.matches_played}</div>
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>MATCHES</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── FILTER TABS ───────────────────────────────── */}
        <div className="flex gap-2 mb-5 fade-in-3">
          {(['all', 'MM', 'HB'] as const).map(f => {
            const active = filter === f
            const fColor = f === 'MM' ? 'var(--mm)' : f === 'HB' ? 'var(--hb)' : 'var(--text)'
            const fDim   = f === 'MM' ? 'var(--mm-dim)' : f === 'HB' ? 'var(--hb-dim)' : 'var(--bg3)'
            const fBorder = f === 'MM' ? 'var(--mm-border)' : f === 'HB' ? 'var(--hb-border)' : 'var(--border2)'
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-xl font-mono text-xs tracking-widest uppercase transition-all"
                style={{
                  background: active ? fDim : 'transparent',
                  border: `1px solid ${active ? fBorder : 'var(--border)'}`,
                  color: active ? fColor : 'var(--text3)',
                  cursor: 'pointer',
                }}
              >
                {f === 'all' ? '⚡ All Players' : f === 'MM' ? '🟡 Mighty Mavericks' : '🔵 Hell Boys'}
              </button>
            )
          })}
        </div>

        {/* ── LEADERBOARD LIST ─────────────────────────── */}
        {loading ? (
          <div className="text-center py-24">
            <div className="font-display text-4xl tracking-widest mb-3" style={{ color: 'var(--border2)' }}>
              LOADING
            </div>
            <div className="font-mono text-xs tracking-[4px]" style={{ color: 'var(--text3)' }}>
              Fetching live standings...
            </div>
          </div>
        ) : (
          <div className="fade-in-4">
            {/* Section label */}
            {filter === 'all' && displayed.length > 3 && (
              <div className="font-mono text-xs tracking-[4px] uppercase mb-4" style={{ color: 'var(--text3)' }}>
                Full Rankings
              </div>
            )}

            <div className="flex flex-col gap-2">
              {(filter === 'all' ? rest : displayed).map((player) => {
                const rank        = players.indexOf(player) + 1
                const isMM        = player.team === 'MM'
                const color       = isMM ? 'var(--mm)' : 'var(--hb)'
                const dimColor    = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
                const borderColor = isMM ? 'var(--mm-border)' : 'var(--hb-border)'

                return (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className="card-hover cursor-pointer rounded-xl flex items-center gap-4 px-4 py-3.5 transition-all"
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    {/* Rank number */}
                    <div
                      className="w-8 text-center flex-shrink-0 font-display text-xl"
                      style={{ color: 'var(--text3)' }}
                    >
                      {rank}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-xl flex-shrink-0"
                      style={{ background: dimColor, border: `1px solid ${borderColor}`, color }}
                    >
                      {player.short_name.charAt(0)}
                    </div>

                    {/* Name + team */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {player.short_name}
                      </div>
                      <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                        {player.matches_played > 0 && (
                          <span style={{ color: 'var(--border2)' }}> · {player.matches_played}M</span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex gap-5 text-right">
                      <div>
                        <div className="font-display text-lg" style={{ color: 'var(--text2)' }}>{player.total_runs}</div>
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>RUNS</div>
                      </div>
                      <div>
                        <div className="font-display text-lg" style={{ color: 'var(--text2)' }}>{player.total_wickets}</div>
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>WKTS</div>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-display text-3xl" style={{ color }}>{player.total_points}</div>
                      <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>PTS</div>
                    </div>
                  </div>
                )
              })}

              {displayed.length === 0 && (
                <div
                  className="text-center py-20 rounded-2xl"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <div className="text-5xl mb-4">🏏</div>
                  <div className="font-display text-2xl tracking-widest mb-2" style={{ color: 'var(--border2)' }}>
                    NO MATCHES YET
                  </div>
                  <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                    Standings update live after each match
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER ───────────────────────────────────── */}
        <div className="mt-12 text-center">
          <div className="divider mb-4" />
          <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
            Click any player for full match breakdown · Points update live
          </p>
        </div>
      </main>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  )
}
