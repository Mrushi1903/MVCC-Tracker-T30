'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Player, Match } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import { parseCricClubCSV } from '@/lib/parseCSV'
import Nav from '@/components/Nav'

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

const ADMIN_PASSWORD = 'mvcc2026'

// Parse date string "YYYY-MM-DD" without timezone shift
function formatMatchDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)

  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [matchResult, setMatchResult] = useState<'won' | 'lost' | 'tied' | 'no_result'>('won')
  const [mvccScore, setMvccScore] = useState('')
  const [opponentScore, setOpponentScore] = useState('')
  const [entries, setEntries] = useState<PerfEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // CSV upload state
  const [parsing, setParsing] = useState(false)
  const [parseMsg, setParseMsg] = useState('')
  const [parsedCount, setParsedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (authed) fetchData() }, [authed])

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

  // ── LOGIN SCREEN ─────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔒</div>
            <div className="font-display text-3xl tracking-wider" style={{ color: 'var(--text)' }}>ADMIN ACCESS</div>
            <p className="font-mono text-xs mt-2 tracking-widest" style={{ color: 'var(--text3)' }}>MVCC TOURNAMENT 2026</p>
          </div>
          <input
            type="password"
            placeholder="Enter password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { if (pw === ADMIN_PASSWORD) setAuthed(true); else setPwError(true) } }}
            className="w-full px-4 py-3 rounded-xl text-sm font-mono mb-3 outline-none"
            style={{ background: 'var(--bg3)', border: `1px solid ${pwError ? 'var(--red)' : 'var(--border)'}`, color: 'var(--text)' }}
          />
          {pwError && <p className="font-mono text-xs text-center mb-3" style={{ color: 'var(--red)' }}>Wrong password</p>}
          <button
            onClick={() => { if (pw === ADMIN_PASSWORD) setAuthed(true); else setPwError(true) }}
            className="w-full py-3 rounded-xl font-display text-lg tracking-wider"
            style={{ background: 'var(--mm)', color: 'white', cursor: 'pointer' }}
          >
            ENTER
          </button>
        </div>
      </div>
    )
  }

  const mmPlayers = players.filter(p => p.team === 'MM')
  const hbPlayers = players.filter(p => p.team === 'HB')

  // ── ADMIN PANEL ──────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-[4px] uppercase mb-2" style={{ color: 'var(--text3)' }}>Admin Panel</p>
          <h1 className="font-display text-5xl tracking-wider" style={{ color: 'var(--text)' }}>ENTER SCORECARD</h1>
        </div>

        {/* ── STEP 1: Match selector ── */}
        <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>1. Select Match</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {matches.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMatch(m.id)
                  // Reset CSV state when switching matches
                  setParsedCount(0)
                  setParseMsg('')
                }}
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
                {/* FIX: parse date parts directly to avoid UTC→local timezone shift */}
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
                From CricClub scorecard → click <strong style={{ color: 'var(--text2)' }}>Export to Excel/CSV</strong> → upload here. Batting, bowling and fielding auto-fill.
              </p>
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: parsedCount > 0 ? 'var(--green)' : 'var(--border2)',
                  background: 'var(--bg3)',
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) handleCSVUpload(f)
                }}
              >
                <div className="text-4xl mb-3">{parsedCount > 0 ? '✅' : '📊'}</div>
                <div className="font-display text-xl tracking-wider mb-1" style={{ color: 'var(--text)' }}>
                  {parsing ? 'PARSING...' : parsedCount > 0 ? `${parsedCount} PLAYERS LOADED` : 'DROP CSV HERE'}
                </div>
                <div className="font-mono text-xs" style={{ color: parsedCount > 0 ? 'var(--green)' : 'var(--text3)' }}>
                  {parseMsg || 'or click to browse · viewScorecardExcel.csv'}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleCSVUpload(f)
                    // Reset input so same file can be re-uploaded
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            {/* ── STEP 3: Match result ── */}
            <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>3. Confirm Match Result</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {(['won', 'lost', 'tied', 'no_result'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setMatchResult(r)}
                    className="py-2 px-4 rounded-xl font-mono text-xs tracking-widest uppercase transition-all"
                    style={{
                      background: matchResult === r ? 'var(--bg3)' : 'transparent',
                      border: `1px solid ${matchResult === r ? 'var(--border2)' : 'var(--border)'}`,
                      color: matchResult === r
                        ? r === 'won' ? 'var(--green)' : r === 'lost' ? 'var(--red)' : 'var(--text)'
                        : 'var(--text3)',
                      cursor: 'pointer',
                    }}
                  >
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-xs tracking-widest block mb-1.5" style={{ color: 'var(--text3)' }}>MVCC SCORE</label>
                  <input
                    value={mvccScore}
                    onChange={e => setMvccScore(e.target.value)}
                    placeholder="e.g. 145/6 (30 Overs)"
                    className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label className="font-mono text-xs tracking-widest block mb-1.5" style={{ color: 'var(--text3)' }}>OPPONENT SCORE</label>
                  <input
                    value={opponentScore}
                    onChange={e => setOpponentScore(e.target.value)}
                    placeholder="e.g. 132/8 (30 Overs)"
                    className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
            </div>

            {/* ── STEP 4: Player stats table ── */}
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
                              <div className="font-display text-xs" style={{ color: pts.total_points > 0 ? 'var(--mm)' : 'var(--text3)' }}>
                                {pts.total_points} pts
                              </div>
                            </td>
                            {(['runs', 'balls_faced', 'overs_bowled', 'runs_conceded', 'wickets', 'catches', 'runout_fielder', 'runout_helper', 'stumpings'] as const).map(field => (
                              <td key={field} className="px-2 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  step={field === 'overs_bowled' ? 0.1 : 1}
                                  value={entry[field] as number}
                                  onChange={e => updateEntry(player.id, field, parseFloat(e.target.value) || 0)}
                                  className="w-14 px-2 py-1.5 rounded-lg text-center font-mono text-xs outline-none"
                                  style={{
                                    background: (entry[field] as number) > 0 ? '#ffffff10' : 'var(--bg3)',
                                    border: `1px solid ${(entry[field] as number) > 0 ? 'var(--border2)' : 'var(--border)'}`,
                                    color: 'var(--text)',
                                  }}
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2">
                              <button
                                onClick={() => updateEntry(player.id, 'is_potm', !entry.is_potm)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                style={{
                                  background: entry.is_potm ? 'var(--mm-dim)' : 'var(--bg3)',
                                  border: `1px solid ${entry.is_potm ? 'var(--mm-border)' : 'var(--border)'}`,
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                }}
                              >
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
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-xl font-display text-2xl tracking-wider transition-all"
              style={{
                background: saved ? 'var(--green)' : 'var(--mm)',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'SAVING...' : saved ? '✓ SAVED!' : 'SAVE SCORECARD'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
