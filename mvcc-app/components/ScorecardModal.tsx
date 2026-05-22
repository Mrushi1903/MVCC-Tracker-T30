'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase, Match, Performance, Player, OpponentBatting, OpponentBowling } from '@/lib/supabase'
import { getPlayerImage } from '@/lib/playerImages'

type FullPerf = Performance & { player: Player }

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
      background: 'var(--bg4)', border: '1px solid var(--border2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bebas Neue', cursive", fontSize: size * 0.45,
      color: 'var(--mm)', flexShrink: 0,
    }}>
      {shortName.charAt(0)}
    </div>
  )
}

export default function ScorecardModal({ match, onClose }: { match: Match; onClose: () => void }) {
  const [mvccPerfs,   setMvccPerfs]   = useState<FullPerf[]>([])
  const [oppBatting,  setOppBatting]  = useState<OpponentBatting[]>([])
  const [oppBowling,  setOppBowling]  = useState<OpponentBowling[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<'mvcc' | 'opponent'>('mvcc')

  useEffect(() => {
    loadScorecard()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [match.id])

  async function loadScorecard() {
    setLoading(true)
    const [perfRes, oppBatRes, oppBowRes] = await Promise.all([
      supabase.from('performances').select('*, player:players(*)').eq('match_id', match.id).order('total_points', { ascending: false }),
      supabase.from('opponent_batting').select('*').eq('match_id', match.id),
      supabase.from('opponent_bowling').select('*').eq('match_id', match.id),
    ])
    if (perfRes.data)   setMvccPerfs(perfRes.data as FullPerf[])
    if (oppBatRes.data) setOppBatting(oppBatRes.data as OpponentBatting[])
    if (oppBowRes.data) setOppBowling(oppBowRes.data as OpponentBowling[])
    setLoading(false)
  }

  const [y, mo, d] = match.date.split('-').map(Number)
  const dateStr = new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const resultColor = match.result === 'won' ? 'var(--green)' : match.result === 'lost' ? 'var(--red)' : 'var(--gold)'
  const resultLabel = match.result === 'won' ? '🏆 MVCC WON' : match.result === 'lost' ? '❌ MVCC LOST' : match.result === 'tied' ? '🤝 TIED' : 'PLAYED'

  // Split MVCC perfs into batsmen + bowlers
  const mvccBatsmen = mvccPerfs.filter(p => p.runs > 0 || p.balls_faced > 0).sort((a,b) => b.runs - a.runs)
  const mvccBowlers = mvccPerfs.filter(p => p.overs_bowled >= 1).sort((a,b) => b.wickets - a.wickets || a.runs_conceded - b.runs_conceded)
  const mvccFielding = mvccPerfs.filter(p => p.catches > 0 || p.stumpings > 0 || p.runout_fielder > 0)

  const oppBatsmenSorted = [...oppBatting].sort((a,b) => b.runs - a.runs)
  const oppBowlersSorted = [...oppBowling].sort((a,b) => b.wickets - a.wickets || a.runs_conceded - b.runs_conceded)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full md:max-w-3xl rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          maxHeight: '92vh', overflowY: 'auto',
          animation: 'fadeInUp 0.3s ease',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}>

        {/* Top accent */}
        <div style={{ height: 3, background: `linear-gradient(90deg, var(--mm), transparent 50%, ${match.result === 'won' ? 'var(--green)' : 'var(--red)'})` }} />

        {/* ── HEADER ──────────────────────────────────── */}
        <div className="p-5 pb-4" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono text-xs tracking-[3px] uppercase mb-1" style={{ color: 'var(--text3)' }}>
                Match {match.match_number} · {dateStr}
              </div>
              <div className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>
                MVCC <span style={{ color: 'var(--text3)' }}>vs</span> {match.opponent}
              </div>
              <div className="font-mono text-xs mt-1" style={{ color: 'var(--text3)' }}>
                📍 {match.ground}
              </div>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer' }}>
              ✕
            </button>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-3 items-center">
            {/* MVCC */}
            <div className="text-left">
              <div className="font-mono text-xs tracking-widest mb-1" style={{ color: 'var(--mm)', opacity: 0.8 }}>MVCC</div>
              <div className="font-display text-4xl" style={{ color: 'var(--mm)' }}>
                {match.mvcc_score || '—'}
              </div>
            </div>

            {/* Result */}
            <div className="text-center">
              <div className="font-display text-sm tracking-widest px-3 py-1.5 rounded-full inline-block"
                style={{ color: resultColor, background: `${resultColor}15`, border: `1px solid ${resultColor}30` }}>
                {resultLabel}
              </div>
            </div>

            {/* Opponent */}
            <div className="text-right">
              <div className="font-mono text-xs tracking-widest mb-1" style={{ color: 'var(--hb)', opacity: 0.8 }}>
                {match.opponent_short || match.opponent.split(' ').slice(0,2).join(' ')}
              </div>
              <div className="font-display text-4xl" style={{ color: 'var(--hb)' }}>
                {match.opponent_score || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ─────────────────────────────────────── */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          {([
            { key: 'mvcc',     label: '🟡 MVCC Innings'     },
            { key: 'opponent', label: '🔵 Opponent Innings'  },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 font-mono text-xs tracking-widest uppercase transition-all"
              style={{
                color:      activeTab === tab.key ? 'var(--mm)' : 'var(--text3)',
                background: activeTab === tab.key ? 'var(--bg3)' : 'transparent',
                borderBottom: activeTab === tab.key ? '2px solid var(--mm)' : '2px solid transparent',
                cursor: 'pointer',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '2px solid var(--border2)', borderTop: '2px solid var(--mm)',
              animation: 'rotateSlow 1s linear infinite', margin: '0 auto 12px',
            }} />
            <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>LOADING SCORECARD...</div>
          </div>
        ) : (
          <div className="p-5">

            {/* ── MVCC INNINGS ─────────────────────────── */}
            {activeTab === 'mvcc' && (
              <div>
                {/* Batting */}
                <div className="mb-6">
                  <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center gap-2"
                    style={{ color: 'var(--text3)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mm)', display: 'inline-block' }} />
                    Batting
                  </div>

                  {/* Table header */}
                  <div className="grid font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 mb-1"
                    style={{ gridTemplateColumns: '1fr 48px 48px 48px 48px 56px', color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 8 }}>
                    <span>Batsman</span>
                    <span className="text-right">R</span>
                    <span className="text-right">B</span>
                    <span className="text-right">4s</span>
                    <span className="text-right">6s</span>
                    <span className="text-right">SR</span>
                  </div>

                  {mvccBatsmen.length === 0 ? (
                    <div className="text-center py-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>No batting data</div>
                  ) : mvccBatsmen.map((perf, i) => (
                    <div key={perf.id}
                      className="grid items-center px-3 py-2.5 rounded-lg mb-1"
                      style={{
                        gridTemplateColumns: '1fr 48px 48px 48px 48px 56px',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}>
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar shortName={perf.player?.short_name || ''} size={28} />
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                            {perf.player?.short_name}
                            {perf.is_potm && <span className="ml-1.5 text-xs">🏅</span>}
                          </div>
                          <div className="font-mono text-[9px]" style={{ color: 'var(--text3)' }}>
                            +{perf.batting_points}pts
                          </div>
                        </div>
                      </div>
                      <div className="font-display text-lg text-right" style={{ color: perf.runs >= 30 ? 'var(--mm)' : 'var(--text)' }}>
                        {perf.runs}
                      </div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{perf.balls_faced}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{perf.fours}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{perf.sixes}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text3)' }}>
                        {getStrikeRate(perf.runs, perf.balls_faced)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bowling */}
                <div className="mb-6">
                  <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center gap-2"
                    style={{ color: 'var(--text3)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hb)', display: 'inline-block' }} />
                    Bowling
                  </div>

                  <div className="grid font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 mb-1"
                    style={{ gridTemplateColumns: '1fr 48px 40px 48px 48px 56px', color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 8 }}>
                    <span>Bowler</span>
                    <span className="text-right">O</span>
                    <span className="text-right">M</span>
                    <span className="text-right">R</span>
                    <span className="text-right">W</span>
                    <span className="text-right">ECO</span>
                  </div>

                  {mvccBowlers.length === 0 ? (
                    <div className="text-center py-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>No bowling data</div>
                  ) : mvccBowlers.map((perf, i) => (
                    <div key={perf.id}
                      className="grid items-center px-3 py-2.5 rounded-lg mb-1"
                      style={{
                        gridTemplateColumns: '1fr 48px 40px 48px 48px 56px',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}>
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar shortName={perf.player?.short_name || ''} size={28} />
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{perf.player?.short_name}</div>
                          <div className="font-mono text-[9px]" style={{ color: 'var(--text3)' }}>+{perf.bowling_points}pts</div>
                        </div>
                      </div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{formatOvers(perf.overs_bowled)}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{perf.maidens}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{perf.runs_conceded}</div>
                      <div className="font-display text-lg text-right"
                        style={{ color: perf.wickets > 0 ? 'var(--green)' : 'var(--text)' }}>
                        {perf.wickets}
                      </div>
                      <div className="font-mono text-xs text-right"
                        style={{ color: parseFloat(getEconomy(perf.runs_conceded, perf.overs_bowled)) < 4 ? 'var(--green)' : 'var(--text3)' }}>
                        {getEconomy(perf.runs_conceded, perf.overs_bowled)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fielding */}
                {mvccFielding.length > 0 && (
                  <div>
                    <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center gap-2"
                      style={{ color: 'var(--text3)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
                      Fielding
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mvccFielding.map(perf => (
                        <div key={perf.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                          <PlayerAvatar shortName={perf.player?.short_name || ''} size={22} />
                          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{perf.player?.short_name}</span>
                          <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
                            {perf.catches > 0 && `${perf.catches}ct `}
                            {perf.stumpings > 0 && `${perf.stumpings}st `}
                            {perf.runout_fielder > 0 && `${perf.runout_fielder}ro`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── OPPONENT INNINGS ──────────────────────── */}
            {activeTab === 'opponent' && (
              <div>
                {/* Batting */}
                <div className="mb-6">
                  <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center gap-2"
                    style={{ color: 'var(--text3)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hb)', display: 'inline-block' }} />
                    Batting
                  </div>

                  <div className="grid font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 mb-1"
                    style={{ gridTemplateColumns: '1fr 48px 48px 48px 48px 56px', color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 8 }}>
                    <span>Batsman</span>
                    <span className="text-right">R</span>
                    <span className="text-right">B</span>
                    <span className="text-right">4s</span>
                    <span className="text-right">6s</span>
                    <span className="text-right">SR</span>
                  </div>

                  {oppBatsmenSorted.length === 0 ? (
                    <div className="text-center py-6 rounded-xl font-mono text-xs"
                      style={{ color: 'var(--text3)', background: 'var(--bg3)' }}>
                      No opponent batting data — re-upload CSV to populate
                    </div>
                  ) : oppBatsmenSorted.map((b, i) => (
                    <div key={b.id}
                      className="grid items-center px-3 py-2.5 rounded-lg mb-1"
                      style={{
                        gridTemplateColumns: '1fr 48px 48px 48px 48px 56px',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}>
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{b.player_name}</div>
                        <div className="font-mono text-[9px]" style={{ color: 'var(--text3)' }}>
                          {b.how_out === '' ? 'not out' : b.how_out}
                        </div>
                      </div>
                      <div className="font-display text-lg text-right" style={{ color: b.runs >= 30 ? 'var(--hb)' : 'var(--text)' }}>
                        {b.runs}
                      </div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{b.balls}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{b.fours}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{b.sixes}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text3)' }}>
                        {getStrikeRate(b.runs, b.balls)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bowling */}
                <div>
                  <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center gap-2"
                    style={{ color: 'var(--text3)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mm)', display: 'inline-block' }} />
                    Bowling
                  </div>

                  <div className="grid font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 mb-1"
                    style={{ gridTemplateColumns: '1fr 48px 40px 48px 48px 56px', color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 8 }}>
                    <span>Bowler</span>
                    <span className="text-right">O</span>
                    <span className="text-right">M</span>
                    <span className="text-right">R</span>
                    <span className="text-right">W</span>
                    <span className="text-right">ECO</span>
                  </div>

                  {oppBowlersSorted.length === 0 ? (
                    <div className="text-center py-6 rounded-xl font-mono text-xs"
                      style={{ color: 'var(--text3)', background: 'var(--bg3)' }}>
                      No opponent bowling data — re-upload CSV to populate
                    </div>
                  ) : oppBowlersSorted.map((b, i) => (
                    <div key={b.id}
                      className="grid items-center px-3 py-2.5 rounded-lg mb-1"
                      style={{
                        gridTemplateColumns: '1fr 48px 40px 48px 48px 56px',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}>
                      <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{b.player_name}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{formatOvers(b.overs)}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{b.maidens}</div>
                      <div className="font-mono text-xs text-right" style={{ color: 'var(--text2)' }}>{b.runs_conceded}</div>
                      <div className="font-display text-lg text-right"
                        style={{ color: b.wickets > 0 ? 'var(--green)' : 'var(--text)' }}>
                        {b.wickets}
                      </div>
                      <div className="font-mono text-xs text-right"
                        style={{ color: parseFloat(getEconomy(b.runs_conceded, b.overs)) < 4 ? 'var(--green)' : 'var(--text3)' }}>
                        {getEconomy(b.runs_conceded, b.overs)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
