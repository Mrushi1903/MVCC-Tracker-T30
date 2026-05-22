'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import { getPlayerImage } from '@/lib/playerImages'
import Nav from '@/components/Nav'
import TeamBanner from '@/components/TeamBanner'
import PlayerModal from '@/components/PlayerModal'
import BackgroundCanvas from '@/components/BackgroundCanvas'
import HorseWatermark from '@/components/HorseWatermark'

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

const PODIUM_MEDALS = ['🥇', '🥈', '🥉']

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
  const [listVisible,    setListVisible]    = useState(false)

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
        p.total_points  += pts.total_points
        p.total_runs    += perf.runs
        p.total_wickets += perf.wickets
        p.total_catches += perf.catches
        p.matches_played += 1
      }
    }
    setPlayers(Array.from(playerMap.values()).sort((a, b) => b.total_points - a.total_points))
    setLoading(false)
    setTimeout(() => setListVisible(true), 100)
  }

  const mmPlayers  = players.filter(p => p.team === 'MM')
  const hbPlayers  = players.filter(p => p.team === 'HB')
  const mmTotal    = mmPlayers.reduce((s, p) => s + p.total_points, 0)
  const hbTotal    = hbPlayers.reduce((s, p) => s + p.total_points, 0)
  const top3       = players.slice(0, 3)
  const restAll    = players.slice(3)
  const filtered   = filter === 'all' ? restAll : players.filter(p => p.team === filter)
  const showPodium = filter === 'all' && !loading && top3.length > 0

  return (
    <div style={{ background: '#05080f', minHeight: '100vh', position: 'relative' }}>

      {/* ── FULL ANIMATED BACKGROUND ────────────────────── */}
      <BackgroundCanvas />
      <HorseWatermark />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />

        <main className="max-w-5xl mx-auto px-4 py-12">

          {/* ── HERO ──────────────────────────────────────── */}
          <div className="mb-12 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="live-dot" />
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
            <div style={{
              width: 80, height: 3, marginTop: 12,
              background: 'linear-gradient(90deg, var(--mm), transparent)',
              borderRadius: 99,
            }} />
            <p className="font-mono text-sm mt-4" style={{ color: 'var(--text3)' }}>
              Mavericks Cricket Club · T30 Internal Tournament · 8 Matches
            </p>
          </div>

          {/* ── TEAM BANNER ───────────────────────────────── */}
          <TeamBanner mmTotal={mmTotal} hbTotal={hbTotal} />

          {/* ── TOP 3 PODIUM ──────────────────────────────── */}
          {showPodium && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5 fade-in-2">
                <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
                  Top Performers
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {top3.map((player, i) => {
                  const isMM    = player.team === 'MM'
                  const color   = isMM ? 'var(--mm)' : 'var(--hb)'
                  const dimC    = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
                  const borderC = isMM ? 'var(--mm-border)' : 'var(--hb-border)'
                  const glowC   = isMM ? 'rgba(201,168,76,0.18)' : 'rgba(59,130,246,0.18)'
                  const isFirst = i === 0

                  return (
                    <div key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`card-hover cursor-pointer rounded-2xl overflow-hidden relative ${isFirst ? 'scale-in' : i === 1 ? 'fade-in-2' : 'fade-in-3'}`}
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
                      }}>

                      {/* Top shimmer line */}
                      <div style={{
                        height: 2,
                        background: isFirst
                          ? 'linear-gradient(90deg, transparent, #c9a84c, #f5e070, #c9a84c, transparent)'
                          : `linear-gradient(90deg, transparent, ${color}80, transparent)`,
                        animation: isFirst ? 'shimmer 3s linear infinite' : 'none',
                        backgroundSize: '200% auto',
                      }} />

                      <div className="p-5 text-center">
                        <div className={`text-4xl mb-4 ${isFirst ? 'float' : ''}`}>
                          {PODIUM_MEDALS[i]}
                        </div>

                        {/* Avatar */}
                        <div className="flex justify-center mb-3 relative">
                          <PlayerAvatar
                            shortName={player.short_name}
                            size={isFirst ? 76 : 60}
                            color={color} dimColor={dimC} borderColor={borderC}
                            fontSize={isFirst ? 30 : 22}
                          />
                          {isFirst && (
                            <>
                              <div style={{
                                position: 'absolute', inset: -3, borderRadius: 24,
                                border: '1px solid rgba(201,168,76,0.3)',
                                animation: 'pulse 3s ease infinite',
                              }} />
                              <div style={{
                                position: 'absolute', inset: -8, borderRadius: 28,
                                border: '1px solid rgba(201,168,76,0.1)',
                                animation: 'pulse 3s ease 1s infinite',
                              }} />
                            </>
                          )}
                        </div>

                        <div className="font-display text-2xl tracking-wider mb-0.5" style={{ color: 'var(--text)' }}>
                          {player.short_name.toUpperCase()}
                        </div>
                        <div className="font-mono text-xs mb-4" style={{ color: 'var(--text3)' }}>
                          {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                        </div>

                        {/* Points */}
                        <div className={`font-display leading-none ${isFirst ? 'gold-shimmer' : ''}`}
                          style={isFirst ? { fontSize: 56 } : { fontSize: 56, color }}>
                          {player.total_points}
                        </div>
                        <div className="font-mono text-[10px] tracking-widest mt-1 mb-4" style={{ color: 'var(--text3)' }}>
                          TOURNAMENT POINTS
                        </div>

                        {/* Stats */}
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── FILTER TABS ────────────────────────────────── */}
          <div className="flex gap-2 mb-6 fade-in-3">
            {(['all', 'MM', 'HB'] as const).map(f => {
              const active  = filter === f
              const fColor  = f === 'MM' ? 'var(--mm)' : f === 'HB' ? 'var(--hb)' : 'var(--text)'
              const fDim    = f === 'MM' ? 'var(--mm-dim)' : f === 'HB' ? 'var(--hb-dim)' : 'var(--bg3)'
              const fBorder = f === 'MM' ? 'var(--mm-border)' : f === 'HB' ? 'var(--hb-border)' : 'var(--border2)'
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-4 py-2 rounded-xl font-mono text-xs tracking-widest uppercase transition-all"
                  style={{
                    background: active ? fDim : 'rgba(11,18,33,0.6)',
                    border: `1px solid ${active ? fBorder : 'var(--border)'}`,
                    color: active ? fColor : 'var(--text3)',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    boxShadow: active ? `0 4px 20px ${fDim}` : 'none',
                  }}>
                  {f === 'all' ? '⚡ All Players' : f === 'MM' ? '🟡 Mighty Mavericks' : '🔵 Hell Boys'}
                </button>
              )
            })}
          </div>

          {/* ── LEADERBOARD ────────────────────────────────── */}
          {loading ? (
            <div className="text-center py-32">
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '2px solid var(--border2)', borderTop: '2px solid var(--mm)',
                animation: 'rotateSlow 1s linear infinite', margin: '0 auto 20px',
              }} />
              <div className="font-display text-3xl tracking-[6px]" style={{ color: 'var(--border2)' }}>
                LOADING
              </div>
            </div>
          ) : (
            <div>
              {filter === 'all' && players.length > 3 && (
                <div className="flex items-center gap-3 mb-5 fade-in-4">
                  <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
                    Full Rankings
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
                </div>
              )}

              <div className="flex flex-col gap-2">
                {filtered.map((player, idx) => {
                  const rank    = players.indexOf(player) + 1
                  const isMM    = player.team === 'MM'
                  const color   = isMM ? 'var(--mm)' : 'var(--hb)'
                  const dimC    = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
                  const borderC = isMM ? 'var(--mm-border)' : 'var(--hb-border)'
                  const rowClass = listVisible ? `row-${Math.min(idx, 19)}` : ''

                  return (
                    <div key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`card-hover cursor-pointer rounded-xl flex items-center gap-4 px-5 py-4 ${rowClass}`}
                      style={{
                        background: 'rgba(11,18,33,0.75)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${color}`,
                        backdropFilter: 'blur(12px)',
                        position: 'relative', overflow: 'hidden',
                      }}>

                      {/* Subtle team glow */}
                      <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: `linear-gradient(90deg, ${isMM ? '#c9a84c06' : '#3b82f606'} 0%, transparent 40%)`,
                      }} />

                      {/* Rank */}
                      <div className="w-8 text-center flex-shrink-0 font-display text-xl"
                        style={{ color: 'var(--text3)' }}>
                        {rank}
                      </div>

                      {/* Photo */}
                      <PlayerAvatar shortName={player.short_name} size={42}
                        color={color} dimColor={dimC} borderColor={borderC} />

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                          {player.short_name}
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

                      {/* Stats */}
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

                      {/* Points */}
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-display text-4xl" style={{
                          color,
                          textShadow: `0 0 20px ${isMM ? 'rgba(201,168,76,0.4)' : 'rgba(59,130,246,0.4)'}`,
                        }}>
                          {player.total_points}
                        </div>
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>PTS</div>
                      </div>
                    </div>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="text-center py-24 rounded-2xl"
                    style={{ background: 'rgba(11,18,33,0.8)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
                    <div className="text-6xl mb-4 float" style={{ display: 'inline-block' }}>🏏</div>
                    <div className="font-display text-3xl tracking-widest mb-2" style={{ color: 'var(--border2)' }}>
                      SEASON STARTING SOON
                    </div>
                    <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                      Standings update live after each match
                    </p>
                  </div>
                )}
              </div>
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

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  )
}
