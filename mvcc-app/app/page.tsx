'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import { getPlayerImage } from '@/lib/playerImages'
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

const PODIUM_MEDALS = ['🥇', '🥈', '🥉']

// Particle canvas background
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#c9a84c', '#3b82f6', '#e8c96d', '#60a5fa']
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.4 + 0.3,
      opacity: Math.random() * 0.35 + 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    let animId: number
    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(201,168,76,${0.04 * (1 - dist / 110)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      animId = requestAnimationFrame(animate)
    }
    animate()
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])
  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, opacity: 0.5,
    }} />
  )
}

// Player avatar — photo if available, else initial
function PlayerAvatar({ shortName, size = 40, color, dimColor, borderColor, fontSize = 18 }: {
  shortName: string; size?: number; color: string; dimColor: string; borderColor: string; fontSize?: number
}) {
  const imgSrc = getPlayerImage(shortName)
  const [imgError, setImgError] = useState(false)

  if (imgSrc && !imgError) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        overflow: 'hidden', border: `1px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        <Image
          src={imgSrc}
          alt={shortName}
          width={size}
          height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: dimColor, border: `1px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bebas Neue', cursive", fontSize, color,
      flexShrink: 0,
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

  const mmPlayers = players.filter(p => p.team === 'MM')
  const hbPlayers = players.filter(p => p.team === 'HB')
  const mmTotal   = mmPlayers.reduce((s, p) => s + p.total_points, 0)
  const hbTotal   = hbPlayers.reduce((s, p) => s + p.total_points, 0)
  const top3      = players.slice(0, 3)
  const restAll   = players.slice(3)
  const filtered  = filter === 'all' ? restAll : players.filter(p => p.team === filter)
  const showPodium = filter === 'all' && !loading && top3.length > 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', position: 'relative' }}>
      <ParticleBackground />

      {/* Ambient glows */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 0% 0%,   #c9a84c09 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 100% 80%, #3b82f609 0%, transparent 60%)
        `,
      }} />

      {/* ── HORSE WATERMARK ─────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 520, height: 520,
        pointerEvents: 'none',
        zIndex: 0,
        animation: 'horsePulse 6s ease-in-out infinite',
      }}>
        <Image
          src="/mavericks-logo.jpeg"
          alt=""
          fill
          style={{
            objectFit: 'contain',
            opacity: 0.032,
            filter: 'grayscale(30%) sepia(40%)',
          }}
        />
      </div>

      {/* Horse pulse keyframe injected inline */}
      <style>{`
        @keyframes horsePulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.7; transform: translate(-50%, -50%) scale(1.03); }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />

        <main className="max-w-5xl mx-auto px-4 py-12">

          {/* HERO */}
          <div className="mb-12 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="live-dot" />
              <span className="font-mono text-xs tracking-[5px] uppercase" style={{ color: 'var(--green)' }}>
                Live Updates · Season 2026
              </span>
            </div>
            <h1 className="font-display tracking-widest" style={{
              fontSize: 'clamp(56px, 10vw, 100px)', lineHeight: 0.9,
              color: 'var(--text)', textShadow: '0 0 80px rgba(201,168,76,0.1)',
            }}>
              STANDINGS
            </h1>
            <div style={{ width: 80, height: 3, marginTop: 12, background: 'linear-gradient(90deg, var(--mm), transparent)', borderRadius: 99 }} />
            <p className="font-mono text-sm mt-4" style={{ color: 'var(--text3)' }}>
              Mavericks Cricket Club · T30 Internal Tournament · 8 Matches
            </p>
          </div>

          {/* TEAM BANNER */}
          <TeamBanner mmTotal={mmTotal} hbTotal={hbTotal} />

          {/* TOP 3 PODIUM */}
          {showPodium && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5 fade-in-2">
                <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>Top Performers</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {top3.map((player, i) => {
                  const isMM    = player.team === 'MM'
                  const color   = isMM ? 'var(--mm)' : 'var(--hb)'
                  const dimC    = isMM ? 'var(--mm-dim)' : 'var(--hb-dim)'
                  const borderC = isMM ? 'var(--mm-border)' : 'var(--hb-border)'
                  const glowC   = isMM ? 'rgba(201,168,76,0.15)' : 'rgba(59,130,246,0.15)'
                  const isFirst = i === 0

                  return (
                    <div key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`card-hover cursor-pointer rounded-2xl overflow-hidden relative ${isFirst ? 'scale-in' : i === 1 ? 'fade-in-2' : 'fade-in-3'}`}
                      style={{
                        background: isFirst ? 'linear-gradient(160deg, #1c1400 0%, #120e02 30%, var(--bg2) 70%)' : 'var(--bg2)',
                        border: `1px solid ${isFirst ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                        boxShadow: isFirst ? `0 8px 40px ${glowC}` : '0 4px 20px rgba(0,0,0,0.3)',
                        marginTop: i === 2 ? 16 : 0,
                      }}>
                      <div style={{ height: 2, background: isFirst ? 'linear-gradient(90deg, transparent, var(--mm), transparent)' : `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
                      <div className="p-5 text-center">
                        <div className={`text-4xl mb-4 ${isFirst ? 'float' : ''}`}>{PODIUM_MEDALS[i]}</div>

                        {/* Player photo */}
                        <div className="flex justify-center mb-3 relative">
                          <PlayerAvatar
                            shortName={player.short_name}
                            size={isFirst ? 72 : 60}
                            color={color} dimColor={dimC} borderColor={borderC}
                            fontSize={isFirst ? 28 : 22}
                          />
                          {isFirst && (
                            <div style={{
                              position: 'absolute', inset: -2, borderRadius: 22,
                              border: '1px solid rgba(201,168,76,0.2)',
                              animation: 'pulse 3s ease infinite',
                            }} />
                          )}
                        </div>

                        <div className="font-display text-2xl tracking-wider mb-0.5" style={{ color: 'var(--text)' }}>
                          {player.short_name.toUpperCase()}
                        </div>
                        <div className="font-mono text-xs mb-4" style={{ color: 'var(--text3)' }}>
                          {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                        </div>
                        <div className={`font-display leading-none ${isFirst ? 'gold-shimmer' : ''}`}
                          style={isFirst ? { fontSize: 52 } : { fontSize: 52, color }}>
                          {player.total_points}
                        </div>
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* FILTER TABS */}
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
                    background: active ? fDim : 'transparent',
                    border: `1px solid ${active ? fBorder : 'var(--border)'}`,
                    color: active ? fColor : 'var(--text3)',
                    cursor: 'pointer',
                    boxShadow: active ? `0 4px 20px ${fDim}` : 'none',
                  }}>
                  {f === 'all' ? '⚡ All Players' : f === 'MM' ? '🟡 Mighty Mavericks' : '🔵 Hell Boys'}
                </button>
              )
            })}
          </div>

          {/* LEADERBOARD */}
          {loading ? (
            <div className="text-center py-32">
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '2px solid var(--border2)', borderTop: '2px solid var(--mm)',
                animation: 'rotateSlow 1s linear infinite', margin: '0 auto 20px',
              }} />
              <div className="font-display text-3xl tracking-[6px]" style={{ color: 'var(--border2)' }}>LOADING</div>
            </div>
          ) : (
            <div>
              {filter === 'all' && players.length > 3 && (
                <div className="flex items-center gap-3 mb-5 fade-in-4">
                  <span className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>Full Rankings</span>
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
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${color}`,
                        position: 'relative', overflow: 'hidden',
                      }}>
                      <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: `linear-gradient(90deg, ${isMM ? '#c9a84c05' : '#3b82f605'}, transparent)`,
                      }} />

                      {/* Rank */}
                      <div className="w-8 text-center flex-shrink-0 font-display text-xl" style={{ color: 'var(--text3)' }}>
                        {rank}
                      </div>

                      {/* Player photo */}
                      <PlayerAvatar shortName={player.short_name} size={40} color={color} dimColor={dimC} borderColor={borderC} />

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{player.short_name}</div>
                        <div className="font-mono text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text3)' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
                          {player.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                          {player.matches_played > 0 && <span style={{ color: 'var(--border2)' }}>· {player.matches_played}M</span>}
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
                          textShadow: `0 0 20px ${isMM ? 'rgba(201,168,76,0.3)' : 'rgba(59,130,246,0.3)'}`,
                        }}>
                          {player.total_points}
                        </div>
                        <div className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text3)' }}>PTS</div>
                      </div>
                    </div>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="text-center py-24 rounded-2xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                    <div className="text-6xl mb-4 float" style={{ display: 'inline-block' }}>🏏</div>
                    <div className="font-display text-3xl tracking-widest mb-2" style={{ color: 'var(--border2)' }}>SEASON STARTING SOON</div>
                    <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>Standings update live after each match</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-16 text-center">
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)', marginBottom: 16 }} />
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              Click any player for full match breakdown · Points update live
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--border2)' }}>MVCC T30 2026 · Michigan · #MaverickSpirit</p>
          </div>
        </main>
      </div>

      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  )
}
