'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Player, Match } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import { parseCricClubCSV } from '@/lib/parseCSV'
import Nav from '@/components/Nav'

// ── ADMIN EMAIL ALLOWLIST ─────────────────────────────────
// Add more emails here anytime, then redeploy
const ADMIN_EMAILS = [
  'mrushireddy2232@gmail.com',
]

type PerfEntry = {
  player_id: number
  runs: number
  balls_faced: number
  overs_bowled: number
  runs_conceded: number
  wickets: number
  catches: number
  runout_fielder: number
  runout_helper: number
  stumpings: number
  is_potm: boolean
}

function formatMatchDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminPage() {
  const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'denied' | 'authorized'>('loading')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [matchResult, setMatchResult] = useState<'won' | 'lost' | 'tied' | 'no_result'>('won')
  const [mvccScore, setMvccScore] = useState('')
  const [opponentScore, setOpponentScore] = useState('')
  const [entries, setEntries] = useState<PerfEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [parsing, setParsing] = useState(false)
  const [parseMsg, setParseMsg] = useState('')
  const [parsedCount, setParsedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── AUTH CHECK ON MOUNT ───────────────────────────────────
  useEffect(() => {
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthState('unauthenticated')
        setUserEmail(null)
      } else {
        const email = session.user.email ?? ''
        setUserEmail(email)
        if (ADMIN_EMAILS.includes(email)) {
          setAuthState('authorized')
        } else {
          setAuthState('denied')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setAuthState('unauthenticated')
      return
    }
    const email = session.user.email ?? ''
    setUserEmail(email)
    if (ADMIN_EMAILS.includes(email)) {
      setAuthState('authorized')
      fetchData()
    } else {
      setAuthState('denied')
    }
  }

  async function handleGoogleSignIn() {
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Sign in error:', error)
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setAuthState('unauthenticated')
    setUserEmail(null)
  }

  async function fetchData() {
    const { data: p } = await supabase.from('players').select('*').order('team').order('name')
    const { data: m } = await supabase.from('matches').select('*').order('date')
    if (p) {
      setPlayers(p)
      setEntries(p.map((pl: Player) => ({
        player_id: pl.id,
        runs: 0, balls_faced: 0, overs_bowled: 0, runs_conceded: 0,
        wickets: 0, catches: 0, runout_fielder: 0, runout_helper: 0,
        stumpings: 0, is_potm: false,
      })))
    }
    if (m) setMatches(m)
  }

  useEffect(() => {
    if (authState === 'authorized') fetchData()
  }, [authState])

  async function handleCSVUpload(file: File) {
    if (!file) return
    setParsing(true)
    setParseMsg('Reading CSV...')
    setParsedCount(0)
    try {
      const text = await file.text()
      const parsed = parseCricClubCSV(text)
      const newEntries = entries.map(e => ({ ...e }))
      let count = 0
      for (const parsedPlayer of parsed.players) {
        const player = players.find(p => p.short_name === parsedPlayer.short_name)
        if (!player) continue
        const entry = newEntries.find(e => e.player_id === player.id)
        if (!entry) continue
        entry.runs = parsedPlayer.runs
        entry.balls_faced = parsedPlayer.balls_faced
        entry.overs_bowled = parsedPlayer.overs_bowled
        entry.runs_conceded = parsedPlayer.runs_conceded
        entry.wickets = parsedPlayer.wickets
        entry.catches = parsedPlayer.catches
        entry.runout_fielder = parsedPlayer.runout_fielder
        entry.runout_helper = parsedPlayer.runout_helper
        entry.stumpings = parsedPlayer.stumpings
        entry.is_potm = parsedPlayer.is_potm
        count++
      }
      setEntries(newEntries)
      setMatchResult(parsed.result)
      if (parsed.mvcc_score) setMvccScore(parsed.mvcc_score)
      if (parsed.opponent_score) setOpponentScore(parsed.opponent_score)
      setParsedCount(count)
      setParseMsg(`✅ Parsed ${count} players! Review below and save.`)
    } catch (err) {
      console.error(err)
      setParseMsg('⚠️ Error parsing CSV. Check the file format.')
    }
    setParsing(false)
  }

  function updateEntry(playerId: number, field: keyof PerfEntry, value: number | boolean) {
    setEntries(prev => prev.map(e => e.player_id === playerId ? { ...e, [field]: value } : e))
  }

  async function handleSave() {
    if (!selectedMatch) return alert('Select a match first')
    setSaving(true)
    await supabase.from('matches').update({
      is_played: true,
      result: matchResult,
      mvcc_score: mvccScore,
      opponent_score: opponentScore,
      potm_player_id: entries.find(e => e.is_potm)?.player_id ?? null,
    }).eq('id', selectedMatch)
    await supabase.from('performances').delete().eq('match_id', selectedMatch)
    const toInsert = entries.filter(e =>
      e.runs > 0 || e.wickets > 0 || e.catches > 0 || e.runout_fielder > 0 ||
      e.runout_helper > 0 || e.stumpings > 0 || e.is_potm || e.overs_bowled > 0
    ).map(e => {
      const pts = calculatePoints({
        runs: e.runs, balls_faced: e.balls_faced, overs_bowled: e.overs_bowled,
        runs_conceded: e.runs_conceded, wickets: e.wickets, catches: e.catches,
        runout_fielder: e.runout_fielder, runout_helper: e.runout_helper,
        stumpings: e.stumpings, is_potm: e.is_potm,
      })
      return {
        match_id: selectedMatch, player_id: e.player_id,
        runs: e.runs, balls_faced: e.balls_faced, overs_bowled: e.overs_bowled,
        runs_conceded: e.runs_conceded, wickets: e.wickets, catches: e.catches,
        runout_fielder: e.runout_fielder, runout_helper: e.runout_helper,
        stumpings: e.stumpings, is_potm: e.is_potm,
        batting_points: pts.batting_points, bowling_points: pts.bowling_points,
        fielding_points: pts.fielding_points, bonus_points: pts.bonus_points,
        total_points: pts.total_points,
      }
    })
    if (toInsert.length > 0) await supabase.from('performances').insert(toInsert)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const mmPlayers = players.filter(p => p.team === 'MM')
  const hbPlayers = players.filter(p => p.team === 'HB')

  // ── LOADING ───────────────────────────────────────────────
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
          Checking auth...
        </div>
      </div>
    )
  }

  // ── SIGN IN SCREEN ────────────────────────────────────────
  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🏏</div>
            <div className="font-display text-3xl tracking-wider" style={{ color: 'var(--text)' }}>ADMIN ACCESS</div>
            <p className="font-mono text-xs mt-2 tracking-widest" style={{ color: 'var(--text3)' }}>MVCC TOURNAMENT 2026</p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all"
            style={{
              background: signingIn ? 'var(--bg3)' : 'white',
              color: '#1f1f1f',
              cursor: signingIn ? 'not-allowed' : 'pointer',
              opacity: signingIn ? 0.7 : 1,
            }}
          >
            {!signingIn && (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
            )}
            {signingIn ? 'Redirecting...' : 'Sign in with Google'}
          </button>
          <p className="text-center font-mono text-xs mt-4" style={{ color: 'var(--text3)' }}>
            Only authorised MVCC admins can access this panel
          </p>
        </div>
      </div>
    )
  }

  // ── ACCESS DENIED ─────────────────────────────────────────
  if (authState === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm p-8 rounded-2xl text-center" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-3">🚫</div>
          <div className="font-display text-3xl tracking-wider mb-2" style={{ color: 'var(--red)' }}>ACCESS DENIED</div>
          <p className="text-sm mb-1" style={{ color: 'var(--text2)' }}>{userEmail}</p>
          <p className="font-mono text-xs mb-6" style={{ color: 'var(--text3)' }}>This email is not on the admin list</p>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 rounded-xl font-mono text-xs tracking-widest uppercase"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // ── ADMIN PANEL ───────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="font-mono text-xs tracking-[4px] uppercase mb-2" style={{ color: 'var(--text3)' }}>Admin Panel</p>
            <h1 className="font-display text-5xl tracking-wider" style={{ color: 'var(--text)' }}>ENTER SCORECARD</h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs mb-2" style={{ color: 'var(--text3)' }}>{userEmail}</p>
            <button
              onClick={handleSignOut}
              className="px-4 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase transition-all"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* ── STEP 1: Match selector ── */}
        <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>1. Select Match</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {matches.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelectedMatch(m.id); setParsedCount(0); setParseMsg('') }}
                className="p-3 rounded-xl text-left transition-all"
                style={{
                  background: selectedMatch === m.id ? 'var(--mm-dim)' : 'var(--bg3)',
                  border: `1px solid ${selectedMatch === m.id ? 'var(--mm-border)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                <div className="font-display text-lg" style={{ color: selectedMatch === m.id ? 'var(--mm)' : 'var(--text)' }}>
                  Match {m.match_number}
                </div>
                <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                  vs {m.opponent.split(' ').slice(0, 2).join(' ')}
                </div>
                <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                  {formatMatchDate(m.date)}
                </div>
                {m.is_played && (
                  <div className="font-mono text-xs mt-1" style={{ color: m.result === 'won' ? 'var(--green)' : m.result === 'lost' ? 'var(--red)' : 'var(--text3)' }}>
                    {m.result?.toUpperCase()}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedMatch && (
          <>
            {/* ── STEP 2: CSV Upload ── */}
            <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <div className="font-mono text-xs tracking-[3px] uppercase mb-1" style={{ color: 'var(--text3)' }}>2. Upload CricClub CSV</div>
              <p className="text-xs mb-3" style={{ color: 'var(--text3)' }}>
                From CricClub scorecard → click <strong style={{ color: 'var(--text2)' }}>Export to Excel/CSV</strong> → upload here.
              </p>
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{ borderColor: parsedCount > 0 ? 'var(--green)' : 'var(--border2)', background: 'var(--bg3)' }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCSVUpload(f) }}
              >
                <div className="text-4xl mb-3">{parsedCount > 0 ? '✅' : '📊'}</div>
                <div className="font-display text-xl tracking-wider mb-1" style={{ color: 'var(--text)' }}>
                  {parsing ? 'PARSING...' : parsedCount > 0 ? `${parsedCount} PLAYERS LOADED` : 'DROP CSV HERE'}
                </div>
                <div className="font-mono text-xs" style={{ color: parsedCount > 0 ? 'var(--green)' : 'var(--text3)' }}>
                  {parseMsg || 'or click to browse · viewScorecardExcel.csv'}
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVUpload(f); e.target.value = '' }} />
              </div>
            </div>

            {/* ── STEP 3: Match result ── */}
            <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>3. Confirm Match Result</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {(['won', 'lost', 'tied', 'no_result'] as const).map(r => (
                  <button key={r} onClick={() => setMatchResult(r)}
                    className="py-2 px-4 rounded-xl font-mono text-xs tracking-widest uppercase transition-all"
                    style={{
                      background: matchResult === r ? 'var(--bg3)' : 'transparent',
                      border: `1px solid ${matchResult === r ? 'var(--border2)' : 'var(--border)'}`,
                      color: matchResult === r ? r === 'won' ? 'var(--green)' : r === 'lost' ? 'var(--red)' : 'var(--text)' : 'var(--text3)',
                      cursor: 'pointer',
                    }}
                  >{r.replace('_', ' ')}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-xs tracking-widest block mb-1.5" style={{ color: 'var(--text3)' }}>MVCC SCORE</label>
                  <input value={mvccScore} onChange={e => setMvccScore(e.target.value)} placeholder="e.g. 145/6 (30 Overs)"
                    className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="font-mono text-xs tracking-widest block mb-1.5" style={{ color: 'var(--text3)' }}>OPPONENT SCORE</label>
                  <input value={opponentScore} onChange={e => setOpponentScore(e.target.value)} placeholder="e.g. 132/8 (30 Overs)"
                    className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
            </div>

            {/* ── STEP 4: Player stats ── */}
            <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>4. Review & Edit Stats</div>
            {[
              { label: '🟠 MIGHTY MAVERICKS', players: mmPlayers },
              { label: '🔵 HELL BOYS', players: hbPlayers },
            ].map(team => (
              <div key={team.label} className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-3 font-display text-xl tracking-wider" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                  {team.label}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Player', 'Runs', 'Balls', 'Overs', 'R.Con', 'Wkts', 'Cts', 'RO-F', 'RO-H', 'Stmp', 'POTM'].map(h => (
                          <th key={h} className="px-3 py-2 font-mono text-xs tracking-widest text-left" style={{ color: 'var(--text3)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {team.players.map(player => {
                        const entry = entries.find(e => e.player_id === player.id)
                        if (!entry) return null
                        const pts = calculatePoints({
                          runs: entry.runs, balls_faced: entry.balls_faced,
                          overs_bowled: entry.overs_bowled, runs_conceded: entry.runs_conceded,
                          wickets: entry.wickets, catches: entry.catches,
                          runout_fielder: entry.runout_fielder, runout_helper: entry.runout_helper,
                          stumpings: entry.stumpings, is_potm: entry.is_potm,
                        })
                        const hasStats = entry.runs > 0 || entry.wickets > 0 || entry.catches > 0 || entry.overs_bowled > 0
                        return (
                          <tr key={player.id} style={{ borderBottom: '1px solid var(--border)', background: hasStats ? '#ffffff06' : 'transparent' }}>
                            <td className="px-3 py-2">
                              <div className="font-medium" style={{ color: 'var(--text)' }}>{player.short_name}</div>
                              <div className="font-display text-xs" style={{ color: pts.total_points > 0 ? 'var(--mm)' : 'var(--text3)' }}>{pts.total_points} pts</div>
                            </td>
                            {(['runs', 'balls_faced', 'overs_bowled', 'runs_conceded', 'wickets', 'catches', 'runout_fielder', 'runout_helper', 'stumpings'] as const).map(field => (
                              <td key={field} className="px-2 py-2">
                                <input type="number" min={0} step={field === 'overs_bowled' ? 0.1 : 1}
                                  value={entry[field] as number}
                                  onChange={e => updateEntry(player.id, field, parseFloat(e.target.value) || 0)}
                                  className="w-14 px-2 py-1.5 rounded-lg text-center font-mono text-xs outline-none"
                                  style={{
                                    background: (entry[field] as number) > 0 ? '#ffffff10' : 'var(--bg3)',
                                    border: `1px solid ${(entry[field] as number) > 0 ? 'var(--border2)' : 'var(--border)'}`,
                                    color: 'var(--text)',
                                  }} />
                              </td>
                            ))}
                            <td className="px-3 py-2">
                              <button onClick={() => updateEntry(player.id, 'is_potm', !entry.is_potm)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                style={{
                                  background: entry.is_potm ? 'var(--mm-dim)' : 'var(--bg3)',
                                  border: `1px solid ${entry.is_potm ? 'var(--mm-border)' : 'var(--border)'}`,
                                  cursor: 'pointer', fontSize: '16px',
                                }}>
                                {entry.is_potm ? '🏅' : '—'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* ── SAVE ── */}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-4 rounded-xl font-display text-2xl tracking-wider transition-all"
              style={{
                background: saved ? 'var(--green)' : 'var(--mm)',
                color: 'white', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}>
              {saving ? 'SAVING...' : saved ? '✓ SAVED!' : 'SAVE SCORECARD'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
