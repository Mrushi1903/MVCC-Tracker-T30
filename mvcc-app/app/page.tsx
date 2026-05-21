'use client'

import { useEffect, useState } from 'react'
import { supabase, Player, Performance, Match } from '@/lib/supabase'
import PlayerModal from '@/components/PlayerModal'
import Nav from '@/components/Nav'
import TeamBanner from '@/components/TeamBanner'
import ScheduleCard from '@/components/ScheduleCard'

type PlayerWithStats = Player & {
  total_points: number
  total_runs: number
  total_wickets: number
  total_catches: number
  matches_played: number
}

export default function Home() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'MM' | 'HB'>('ALL')
  const [tab, setTab] = useState<'leaderboard' | 'schedule'>('leaderboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data: playersData } = await supabase.from('players').select('*').order('name')
    const { data: perfsData } = await supabase.from('performances').select('*')
    const { data: matchesData } = await supabase.from('matches').select('*').order('date')

    if (playersData && perfsData) {
      const withStats: PlayerWithStats[] = playersData.map((p) => {
        const perfs = perfsData.filter((perf) => perf.player_id === p.id)
        return {
          ...p,
          total_points: perfs.reduce((s, x) => s + (x.total_points || 0), 0),
          total_runs: perfs.reduce((s, x) => s + (x.runs || 0), 0),
          total_wickets: perfs.reduce((s, x) => s + (x.wickets || 0), 0),
          total_catches: perfs.reduce((s, x) => s + (x.catches || 0), 0),
          matches_played: perfs.length,
        }
      })
      withStats.sort((a, b) => b.total_points - a.total_points)
      setPlayers(withStats)
    }

    if (matchesData) setMatches(matchesData)
    setLoading(false)
  }

  const mmTotal = players.filter((p) => p.team === 'MM').reduce((s, p) => s + p.total_points, 0)
  const hbTotal = players.filter((p) => p.team === 'HB').reduce((s, p) => s + p.total_points, 0)

  const filtered = filter === 'ALL' ? players : players.filter((p) => p.team === filter)

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'text-[#fbbf24]'
    if (rank === 2) return 'text-[#9ca3af]'
    if (rank === 3) return 'text-[#cd7f32]'
    return 'text-[#30363d]'
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Nav />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="fade-in mb-10">
          <p className="font-mono text-xs tracking-[4px] uppercase mb-3" style={{ color: 'var(--text3)' }}>
            MCA T30 · 2026 Season · Internal Tournament
          </p>
          <h1 className="font-display text-6xl md:text-8xl leading-none mb-2">
            <span style={{ color: 'var(--mm)' }}>MIGHTY</span>
            <span style={{ color: 'var(--text3)', fontSize: '0.5em', margin: '0 12px' }}>VS</span>
            <span style={{ color: 'var(--hb)' }}>HELL BOYS</span>
          </h1>
          <p style={{ color: 'var(--text2)' }} className="text-sm mt-2">
            22 players · 8 matches · Season-long battle for supremacy
          </p>
        </div>

        {/* Team Banner */}
        <div className="fade-in-1">
          <TeamBanner mmTotal={mmTotal} hbTotal={hbTotal} />
        </div>

        {/* Tab switcher */}
        <div className="fade-in-2 flex gap-0 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['leaderboard', 'schedule'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-3 text-sm font-medium capitalize transition-all"
              style={{
                color: tab === t ? 'var(--text)' : 'var(--text3)',
                borderBottom: tab === t ? '2px solid var(--mm)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* LEADERBOARD TAB */}
        {tab === 'leaderboard' && (
          <div className="fade-in-2">
            {/* Filter buttons */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>
                PLAYER RANKINGS
              </h2>
              <div className="flex gap-2">
                {(['ALL', 'MM', 'HB'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1.5 rounded-full text-xs font-mono tracking-widest transition-all"
                    style={{
                      border: `1px solid ${filter === f ? (f === 'MM' ? 'var(--mm)' : f === 'HB' ? 'var(--hb)' : 'var(--border2)') : 'var(--border)'}`,
                      background: filter === f ? (f === 'MM' ? 'var(--mm-dim)' : f === 'HB' ? 'var(--hb-dim)' : 'var(--bg3)') : 'transparent',
                      color: filter === f ? (f === 'MM' ? 'var(--mm)' : f === 'HB' ? 'var(--hb)' : 'var(--text)') : 'var(--text3)',
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20" style={{ color: 'var(--text3)' }}>
                <div className="font-display text-4xl mb-2">LOADING...</div>
                <p className="font-mono text-xs tracking-widest">FETCHING STATS</p>
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                {/* Table header */}
                <div
                  className="grid font-mono text-xs tracking-widest uppercase px-4 py-3"
                  style={{
                    gridTemplateColumns: '44px 1fr 64px 64px 64px 64px 90px',
                    background: 'var(--bg3)',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text3)',
                  }}
                >
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-center">M</span>
                  <span className="text-center">Runs</span>
                  <span className="text-center">Wkts</span>
                  <span className="text-center">Cats</span>
                  <span className="text-right">PTS</span>
                </div>

                {filtered.map((player, idx) => {
                  const rank = players.findIndex((p) => p.id === player.id) + 1
                  return (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="grid items-center px-4 cursor-pointer transition-all"
                      style={{
                        gridTemplateColumns: '44px 1fr 64px 64px 64px 64px 90px',
                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                        padding: '0 16px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#ffffff05')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Rank */}
                      <span className={`font-display text-xl py-4 ${getRankStyle(rank)}`}>
                        {rank}
                      </span>

                      {/* Player */}
                      <div className="flex items-center gap-3 py-4">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-display text-sm flex-shrink-0"
                          style={{
                            background: player.team === 'MM' ? 'var(--mm-dim)' : 'var(--hb-dim)',
                            border: `1px solid ${player.team === 'MM' ? 'var(--mm-border)' : 'var(--hb-border)'}`,
                            color: player.team === 'MM' ? 'var(--mm)' : 'var(--hb)',
                          }}
                        >
                          {player.short_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                            {player.short_name}
                          </div>
                          <div
                            className="font-mono text-xs"
                            style={{ color: player.team === 'MM' ? 'var(--mm)' : 'var(--hb)' }}
                          >
                            {player.team}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <span className="font-mono text-sm text-center" style={{ color: 'var(--text3)' }}>
                        {player.matches_played}
                      </span>
                      <span className="font-mono text-sm text-center" style={{ color: 'var(--text2)' }}>
                        {player.total_runs}
                      </span>
                      <span className="font-mono text-sm text-center" style={{ color: 'var(--text2)' }}>
                        {player.total_wickets}
                      </span>
                      <span className="font-mono text-sm text-center" style={{ color: 'var(--text2)' }}>
                        {player.total_catches}
                      </span>

                      {/* Points */}
                      <span
                        className="font-display text-2xl text-right"
                        style={{ color: player.total_points > 0 ? 'var(--text)' : 'var(--text3)' }}
                      >
                        {player.total_points}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <div className="fade-in-2">
            <h2 className="font-display text-2xl tracking-wider mb-4" style={{ color: 'var(--text)' }}>
              SEASON SCHEDULE
            </h2>
            <div className="flex flex-col gap-3">
              {matches.map((match) => (
                <ScheduleCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
