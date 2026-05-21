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

export default function HomePage() {
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null)
  const [filter, setFilter] = useState<'all' | 'MM' | 'HB'>('all')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  async function fetchLeaderboard() {
    setLoading(true)

    // Fetch all players
    const { data: rawPlayers } = await supabase
      .from('players')
      .select('*')
      .order('team')
      .order('name')

    if (!rawPlayers) { setLoading(false); return }

    // Fetch all performances
    const { data: perfs } = await supabase
      .from('performances')
      .select('*')

    // Aggregate per player
    const playerMap = new Map<number, PlayerRow>()
    for (const pl of rawPlayers) {
      playerMap.set(pl.id, {
        id: pl.id,
        name: pl.name,
        short_name: pl.short_name,
        team: pl.team,
        jersey_number: pl.jersey_number,
        total_points: 0,
        total_runs: 0,
        total_wickets: 0,
        total_catches: 0,
        matches_played: 0,
      })
    }

    if (perfs) {
      for (const perf of perfs) {
        const p = playerMap.get(perf.player_id)
        if (!p) continue
        const pts = calculatePoints({
          runs: perf.runs,
          balls_faced: perf.balls_faced,
          overs_bowled: perf.overs_bowled,
          runs_conceded: perf.runs_conceded,
          wickets: perf.wickets,
          catches: perf.catches,
          runout_fielder: perf.runout_fielder,
          runout_helper: perf.runout_helper,
          stumpings: perf.stumpings,
          is_potm: perf.is_potm,
        })
        p.total_points += pts.total_points
        p.total_runs += perf.runs
        p.total_wickets += perf.wickets
        p.total_catches += perf.catches
        p.matches_played += 1
      }
    }

    const sorted = Array.from(playerMap.values()).sort(
      (a, b) => b.total_points - a.total_points
    )
    setPlayers(sorted)
    setLoading(false)
  }

  const mmPlayers = players.filter(p => p.team === 'MM')
  const hbPlayers = players.filter(p => p.team === 'HB')
  const mmTotal = mmPlayers.reduce((s, p) => s + p.total_points, 0)
  const hbTotal = hbPlayers.reduce((s, p) => s + p.total_points, 0)

  const displayed = filter === 'all' ? players : players.filter(p => p.team === filter)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-xs tracking-[4px] uppercase mb-2" style={{ color: 'var(--text3)' }}>
            Season 2026 · T30 Internal
          </p>
          <h1 className="font-display text-5xl tracking-wider" style={{ color: 'var(--text)' }}>
            STANDINGS
          </h1>
        </div>

        {/* Team banner */}
        <TeamBanner mmTotal={mmTotal} hbTotal={hbTotal} />

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'MM', 'HB'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl font-mono text-xs tracking-widest uppercase transition-all"
              style={{
                background: filter === f ? 'var(--bg3)' : 'transparent',
                border: `1px solid ${filter === f ? 'var(--border2)' : 'var(--border)'}`,
                color: filter === f
                  ? f === 'MM' ? 'var(--mm)' : f === 'HB' ? 'var(--hb)' : 'var(--text)'
                  : 'var(--text3)',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All Players' : f === 'MM' ? '🟠 Mighty Mavericks' : '🔵 Hell Boys'}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="text-center py-20">
            <div className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
              Loading standings...
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayed.map((player, idx) => {
              const rank = players.indexOf(player) + 1
              const isTeamMM = player.team === 'MM'
              const color = isTeamMM ? 'var(--mm)' : 'var(--hb)'
              const dimColor = isTeamMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
              const borderColor = isTeamMM ? 'var(--mm-border)' : 'var(--hb-border)'

              return (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all card-hover"
                  style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${rank <= 3 ? color : 'var(--border)'}`,
                  }}
                >
                  {/* Rank */}
                  <div
                    className="w-8 text-center flex-shrink-0 font-display text-2xl"
                    style={{ color: rank <= 3 ? color : 'var(--text3)' }}
                  >
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
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
                    <div className="font-medium" style={{ color: 'var(--text)' }}>
                      {player.short_name}
                    </div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                      {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                      {player.matches_played > 0 && ` · ${player.matches_played}M`}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="hidden sm:flex gap-4 text-right">
                    <div>
                      <div className="font-display text-lg" style={{ color: 'var(--text2)' }}>
                        {player.total_runs}
                      </div>
                      <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text3)' }}>
                        RUNS
                      </div>
                    </div>
                    <div>
                      <div className="font-display text-lg" style={{ color: 'var(--text2)' }}>
                        {player.total_wickets}
                      </div>
                      <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text3)' }}>
                        WKTS
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-display text-3xl" style={{ color }}>
                      {player.total_points}
                    </div>
                    <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text3)' }}>
                      PTS
                    </div>
                  </div>
                </div>
              )
            })}

            {displayed.length === 0 && (
              <div
                className="text-center py-16 rounded-xl"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                <div className="text-4xl mb-3">🏏</div>
                <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                  NO MATCHES PLAYED YET
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--text3)' }}>
                  Standings will update after first match
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
            Click any player for full match breakdown · Points update live after each match
          </p>
        </div>
      </main>

      {/* Player modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
