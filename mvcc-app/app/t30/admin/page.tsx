'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, fetchTournament, Player, Match, Availability, AvailabilityStatus } from '@/lib/supabase'
import { calculatePoints } from '@/lib/points'
import { parseCricClubCSV } from '@/lib/parseCSV'
import { emailForShortName } from '@/lib/playerEmails'
import Nav from '@/components/Nav'

const ADMIN_EMAILS = [
  'mrushireddy2232@gmail.com',  // Rushi
  'viswakasu@gmail.com',         // Viswa — Captain
  'rohitmaddipati@gmail.com',    // Rohith — VC
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
  // New from CSV — preserved through the admin flow so we can persist on save.
  how_out: string | null
  fielder: string | null
  bowler_name: string | null
  wides: number
  no_balls: number
  dot_balls: number
  fours: number
  sixes: number
}

type AdminTab = 'scorecard' | 'availability'

function formatMatchDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminPage() {
  const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'denied' | 'authorized'>('loading')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [tab, setTab] = useState<AdminTab>('scorecard')

  // Shared data
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])

  // Scorecard state
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [matchResult,   setMatchResult]   = useState<'won' | 'lost' | 'tied' | 'no_result'>('won')
  const [mvccScore,     setMvccScore]     = useState('')
  const [opponentScore, setOpponentScore] = useState('')
  const [entries,       setEntries]       = useState<PerfEntry[]>([])
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [saveError,     setSaveError]     = useState<string | null>(null)
  const [parsing,     setParsing]     = useState(false)
  const [parseMsg,    setParseMsg]    = useState('')
  const [parsedCount, setParsedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [lastParsed, setLastParsed] = useState<Awaited<ReturnType<typeof parseCricClubCSV>> | null>(null)

  // Availability state
  const [availMatchId, setAvailMatchId] = useState<number | null>(null)
  const [availRows, setAvailRows] = useState<Availability[]>([])
  const [playing12, setPlaying12] = useState<number[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [p12Saving, setP12Saving] = useState(false)
  const [p12Saved, setP12Saved] = useState(false)

  useEffect(() => {
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setAuthState('unauthenticated'); setUserEmail(null) }
      else {
        const email = session.user.email ?? ''
        setUserEmail(email)
        setAuthState(ADMIN_EMAILS.includes(email) ? 'authorized' : 'denied')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAuthState('unauthenticated'); return }
    const email = session.user.email ?? ''
    setUserEmail(email)
    if (ADMIN_EMAILS.includes(email)) { setAuthState('authorized') }
    else setAuthState('denied')
  }

  async function handleGoogleSignIn() {
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { console.error(error); setSigningIn(false) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setAuthState('unauthenticated')
    setUserEmail(null)
  }

  async function fetchData() {
    const tournament = await fetchTournament('T30')
    const { data: p } = await supabase.from('players').select('*').order('team').order('name')
    const mQuery = supabase.from('matches').select('*').order('date')
    const { data: m } = tournament
      ? await mQuery.eq('tournament_id', tournament.id)
      : await mQuery
    if (p) {
      setPlayers(p as Player[])
      setEntries((p as Player[]).map(pl => ({
        player_id: pl.id,
        runs: 0, balls_faced: 0, overs_bowled: 0, runs_conceded: 0,
        wickets: 0, catches: 0, runout_fielder: 0, runout_helper: 0,
        stumpings: 0, is_potm: false,
        how_out: null, fielder: null, bowler_name: null,
        wides: 0, no_balls: 0, dot_balls: 0,
        fours: 0, sixes: 0,
      })))
    }
    if (m) setMatches(m as Match[])
  }

  useEffect(() => { if (authState === 'authorized') fetchData() }, [authState])

  // ── Availability sub-flow ──────────────────────────────────
  async function loadAvailability(matchId: number) {
    setAvailLoading(true)
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from('availability').select('*').eq('match_id', matchId),
      supabase.from('matches').select('*').eq('id', matchId).single(),
    ])
    setAvailRows((a ?? []) as Availability[])
    setPlaying12(((m as Match | null)?.playing_12 ?? []) as number[])
    setAvailLoading(false)
    setP12Saved(false)
  }

  useEffect(() => {
    if (availMatchId) loadAvailability(availMatchId)
    else { setAvailRows([]); setPlaying12([]) }
  }, [availMatchId])

  // Manual override — admin can set a player's availability directly
  // (used mainly for Naveen who has no Google email registered).
  async function handleOverrideAvailability(playerId: number, nextStatus: AvailabilityStatus | null) {
    if (!availMatchId) return
    if (nextStatus === null) {
      // Clear the override entirely.
      await supabase
        .from('availability')
        .delete()
        .eq('match_id', availMatchId)
        .eq('player_id', playerId)
    } else {
      await supabase
        .from('availability')
        .upsert(
          {
            match_id: availMatchId,
            player_id: playerId,
            status: nextStatus,
            note: 'Set by admin',
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'match_id,player_id' },
        )
    }
    await loadAvailability(availMatchId)
  }

  async function handleSavePlaying12() {
    if (!availMatchId) return
    setP12Saving(true)

    // 1) Update match playing_12 array
    await supabase.from('matches').update({ playing_12: playing12 }).eq('id', availMatchId)

    // 2) Award +10 availability_points to "available but not picked" players.
    //    First clear any prior availability_points for this match's performances.
    await supabase
      .from('performances')
      .update({ availability_points: 0 })
      .eq('match_id', availMatchId)

    const availableIds = availRows
      .filter(r => r.status === 'available')
      .map(r => r.player_id)
    const benchedAvailable = availableIds.filter(id => !playing12.includes(id))

    if (benchedAvailable.length > 0) {
      // Fetch existing rows so we can preserve their stats and just add +10.
      const { data: existing } = await supabase
        .from('performances')
        .select('*')
        .eq('match_id', availMatchId)
        .in('player_id', benchedAvailable)
      type ExPerf = NonNullable<typeof existing>[number]
      const existingByPlayer = new Map<number, ExPerf>(
        (existing ?? []).map(r => [r.player_id, r])
      )

      for (const pid of benchedAvailable) {
        const ex = existingByPlayer.get(pid)
        if (ex) {
          // Preserve all stats. Recalc total with the new availability bonus.
          const newBonus = (ex.bonus_points ?? 0) + 10
          const newTotal = (ex.batting_points ?? 0) + (ex.bowling_points ?? 0) + (ex.fielding_points ?? 0) + newBonus
          await supabase
            .from('performances')
            .update({
              availability_points: 10,
              bonus_points: newBonus,
              total_points: newTotal,
            })
            .eq('id', ex.id)
        } else {
          // No performance row yet → create a zeroed one with the +10 bonus.
          await supabase.from('performances').insert({
            match_id: availMatchId,
            player_id: pid,
            runs: 0, balls_faced: 0,
            overs_bowled: 0, runs_conceded: 0, wickets: 0,
            catches: 0, runout_fielder: 0, runout_helper: 0, stumpings: 0,
            is_potm: false,
            batting_points: 0, bowling_points: 0, fielding_points: 0,
            bonus_points: 10, availability_points: 10, total_points: 10,
          })
        }
      }
    }

    setP12Saving(false)
    setP12Saved(true)
    setTimeout(() => setP12Saved(false), 3500)
  }

  // ── Scorecard CSV upload ───────────────────────────────────
  async function handleCSVUploadFull(file: File) {
    if (!file) return
    setParsing(true)
    setParseMsg('Reading CSV...')
    setParsedCount(0)
    try {
      const text   = await file.text()
      const parsed = parseCricClubCSV(text)
      setLastParsed(parsed)

      const newEntries = entries.map(e => ({ ...e }))
      let count = 0
      for (const parsedPlayer of parsed.players) {
        const player = players.find(p => p.short_name === parsedPlayer.short_name)
        if (!player) continue
        const entry = newEntries.find(e => e.player_id === player.id)
        if (!entry) continue
        entry.runs           = parsedPlayer.runs
        entry.balls_faced    = parsedPlayer.balls_faced
        entry.overs_bowled   = parsedPlayer.overs_bowled
        entry.runs_conceded  = parsedPlayer.runs_conceded
        entry.wickets        = parsedPlayer.wickets
        entry.catches        = parsedPlayer.catches
        entry.runout_fielder = parsedPlayer.runout_fielder
        entry.runout_helper  = parsedPlayer.runout_helper
        entry.stumpings      = parsedPlayer.stumpings
        entry.is_potm        = parsedPlayer.is_potm
        entry.how_out        = parsedPlayer.how_out
        entry.fielder        = parsedPlayer.fielder
        entry.bowler_name    = parsedPlayer.bowler_name
        entry.wides          = parsedPlayer.wides
        entry.no_balls       = parsedPlayer.no_balls
        entry.dot_balls      = parsedPlayer.dot_balls
        entry.fours          = parsedPlayer.fours
        entry.sixes          = parsedPlayer.sixes
        count++
      }
      setEntries(newEntries)
      setMatchResult(parsed.result)
      if (parsed.mvcc_score)     setMvccScore(parsed.mvcc_score)
      if (parsed.opponent_score) setOpponentScore(parsed.opponent_score)
      setParsedCount(count)
      setParseMsg(`✅ ${count} MVCC players · ${parsed.opponent_batting.length} opp batsmen · ${parsed.opponent_bowling.length} opp bowlers · Result: ${parsed.result.toUpperCase()}`)
    } catch (err) {
      console.error(err)
      setParseMsg('⚠️ Error parsing CSV. Check the file format.')
    }
    setParsing(false)
  }

  function updateEntry(playerId: number, field: keyof PerfEntry, value: number | boolean) {
    setEntries(prev => prev.map(e => e.player_id === playerId ? { ...e, [field]: value } : e))
  }

  async function toggleExternal(playerId: number, next: boolean) {
    await supabase.from('players').update({ is_external: next }).eq('id', playerId)
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, is_external: next } : p))
  }

  async function handleSave() {
    if (!selectedMatch) return alert('Select a match first')
    setSaving(true)
    setSaveError(null)

    // Tiny helper — any step that returns a PostgrestError stops the flow
    // and surfaces it to the UI. Without this, failures silently produce
    // zero rows (as happened pre-migration-004).
    let firstError: string | null = null
    const check = (step: string, err: { message?: string } | null | undefined) => {
      if (err && !firstError) {
        firstError = `${step}: ${err.message ?? 'unknown error'}`
        console.error(`[admin save] ${step}`, err)
      }
    }

    // 1 — Fetch existing availability_points for this match (so we preserve the bonus).
    const prevPerfsRes = await supabase
      .from('performances')
      .select('player_id, availability_points')
      .eq('match_id', selectedMatch)
    check('fetch prev perfs', prevPerfsRes.error)
    const prevAvail = new Map<number, number>(
      (prevPerfsRes.data ?? []).map(r => [r.player_id, r.availability_points ?? 0])
    )

    // 2 — Update match record
    const matchData: Record<string, unknown> = {
      is_played:    true,
      result:       matchResult,
      mvcc_score:   mvccScore,
      opponent_score: opponentScore,
      potm_player_id: entries.find(e => e.is_potm)?.player_id ?? null,
    }
    check('update match', (await supabase.from('matches').update(matchData).eq('id', selectedMatch)).error)

    // 3 — Wipe old MVCC performances for this match
    check('delete old perfs', (await supabase.from('performances').delete().eq('match_id', selectedMatch)).error)

    // 4 — Insert fresh performances (preserve availability_points)
    const toInsert = entries.filter(e =>
      e.runs > 0 || e.wickets > 0 || e.catches > 0 || e.runout_fielder > 0 ||
      e.runout_helper > 0 || e.stumpings > 0 || e.is_potm || e.overs_bowled > 0 ||
      (prevAvail.get(e.player_id) ?? 0) > 0
    ).map(e => {
      const availability_points = prevAvail.get(e.player_id) ?? 0
      const pts = calculatePoints({
        runs: e.runs, balls_faced: e.balls_faced,
        overs_bowled: e.overs_bowled, runs_conceded: e.runs_conceded,
        wickets: e.wickets, catches: e.catches,
        runout_fielder: e.runout_fielder, runout_helper: e.runout_helper,
        stumpings: e.stumpings, is_potm: e.is_potm,
        availability_points,
      })
      return {
        match_id: selectedMatch, player_id: e.player_id,
        runs: e.runs, balls_faced: e.balls_faced,
        fours: e.fours, sixes: e.sixes,
        overs_bowled: e.overs_bowled, runs_conceded: e.runs_conceded,
        wickets: e.wickets, catches: e.catches,
        runout_fielder: e.runout_fielder, runout_helper: e.runout_helper,
        stumpings: e.stumpings, is_potm: e.is_potm,
        how_out: e.how_out, fielder: e.fielder, bowler_name: e.bowler_name,
        wides: e.wides, no_balls: e.no_balls, dot_balls: e.dot_balls,
        batting_points: pts.batting_points, bowling_points: pts.bowling_points,
        fielding_points: pts.fielding_points, bonus_points: pts.bonus_points,
        availability_points,
        total_points: pts.total_points,
      }
    })
    if (toInsert.length > 0) {
      check('insert perfs', (await supabase.from('performances').insert(toInsert)).error)
    }

    // 5 — opponent batting / bowling (now with dismissal fielder/bowler + bowler extras)
    check('delete opp batting', (await supabase.from('opponent_batting').delete().eq('match_id', selectedMatch)).error)
    if (lastParsed?.opponent_batting && lastParsed.opponent_batting.length > 0) {
      check('insert opp batting', (await supabase.from('opponent_batting').insert(
        lastParsed.opponent_batting.map(b => ({ match_id: selectedMatch, ...b }))
      )).error)
    }
    check('delete opp bowling', (await supabase.from('opponent_bowling').delete().eq('match_id', selectedMatch)).error)
    if (lastParsed?.opponent_bowling && lastParsed.opponent_bowling.length > 0) {
      check('insert opp bowling', (await supabase.from('opponent_bowling').insert(
        lastParsed.opponent_bowling.map(b => ({ match_id: selectedMatch, ...b }))
      )).error)
    }
    if (lastParsed?.opponent_name) {
      check('update opponent_short', (await supabase.from('matches')
        .update({ opponent_short: lastParsed.opponent_name })
        .eq('id', selectedMatch)).error)
    }

    // 6 — fall of wickets (replace both innings)
    check('delete FOW', (await supabase.from('fall_of_wickets').delete().eq('match_id', selectedMatch)).error)
    const fowRows: Array<{ match_id: number; innings: 'mvcc' | 'opponent'; wicket_number: number; score: number; over_number: string; batsman_name: string }> = []
    for (const f of lastParsed?.mvcc_fow ?? []) {
      fowRows.push({ match_id: selectedMatch, innings: 'mvcc', ...f })
    }
    for (const f of lastParsed?.opponent_fow ?? []) {
      fowRows.push({ match_id: selectedMatch, innings: 'opponent', ...f })
    }
    if (fowRows.length > 0) {
      check('insert FOW', (await supabase.from('fall_of_wickets').insert(fowRows)).error)
    }

    // 7 — match extras (one row per innings; upsert keyed on (match_id, innings))
    if (lastParsed?.mvcc_extras) {
      check('upsert mvcc extras', (await supabase
        .from('match_extras')
        .upsert(
          { match_id: selectedMatch, innings: 'mvcc', ...lastParsed.mvcc_extras },
          { onConflict: 'match_id,innings' },
        )).error)
    }
    if (lastParsed?.opponent_extras) {
      check('upsert opponent extras', (await supabase
        .from('match_extras')
        .upsert(
          { match_id: selectedMatch, innings: 'opponent', ...lastParsed.opponent_extras },
          { onConflict: 'match_id,innings' },
        )).error)
    }

    setSaving(false)
    if (firstError) {
      setSaveError(firstError)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const mmPlayers = players.filter(p => p.team === 'MM')
  const hbPlayers = players.filter(p => p.team === 'HB')

  // ── LOADING / AUTH SCREENS ─────────────────────────────────
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>Checking auth...</div>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🏏</div>
            <div className="font-display text-3xl tracking-wider" style={{ color: 'var(--text)' }}>ADMIN ACCESS</div>
            <p className="font-mono text-xs mt-2 tracking-widest" style={{ color: 'var(--text3)' }}>MVCC TOURNAMENT 2026</p>
          </div>
          <button onClick={handleGoogleSignIn} disabled={signingIn}
            className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all"
            style={{ background: signingIn ? 'var(--bg3)' : 'white', color: '#1f1f1f', cursor: signingIn ? 'not-allowed' : 'pointer', opacity: signingIn ? 0.7 : 1 }}>
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
          <p className="text-center font-mono text-xs mt-4" style={{ color: 'var(--text3)' }}>Only authorised MVCC admins</p>
        </div>
      </div>
    )
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm p-8 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div className="text-4xl mb-3">🚫</div>
          <div className="font-display text-3xl tracking-wider mb-2" style={{ color: 'var(--red)' }}>ACCESS DENIED</div>
          <p className="text-sm mb-1" style={{ color: 'var(--text2)' }}>{userEmail}</p>
          <p className="font-mono text-xs mb-6" style={{ color: 'var(--text3)' }}>This email is not on the admin list</p>
          <button onClick={handleSignOut} className="px-6 py-2 rounded-xl font-mono text-xs tracking-widest uppercase"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // ── ADMIN PANEL ────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="font-mono text-xs tracking-[4px] uppercase mb-2" style={{ color: 'var(--text3)' }}>Admin Panel</p>
            <h1 className="font-display text-5xl tracking-wider" style={{ color: 'var(--text)' }}>CONTROL ROOM</h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs mb-2" style={{ color: 'var(--text3)' }}>{userEmail}</p>
            <button onClick={handleSignOut}
              className="px-4 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase transition-all"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 relative">
          {([
            { id: 'scorecard',    label: '📋 Scorecard' },
            { id: 'availability', label: '✅ Availability' },
          ] as const).map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text3)',
                  cursor: 'pointer',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="admin-tab"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 12,
                      background: 'rgba(0,229,255,0.08)',
                      border: '1px solid rgba(0,229,255,0.25)',
                      boxShadow: '0 0 14px rgba(0,229,255,0.18)',
                      zIndex: -1,
                    }}
                  />
                )}
                <span style={{ position: 'relative' }}>{t.label}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'scorecard' && (
            <motion.div
              key="scorecard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* STEP 1 — Match selector */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="rounded-xl p-5 mb-6"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>1. Select Match</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {matches.map(m => (
                    <button key={m.id}
                      onClick={() => { setSelectedMatch(m.id); setParsedCount(0); setParseMsg(''); setLastParsed(null) }}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: selectedMatch === m.id ? 'var(--mm-dim)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selectedMatch === m.id ? 'var(--mm-border)' : 'var(--border)'}`,
                        cursor: 'pointer',
                      }}>
                      <div className="font-display text-lg" style={{ color: selectedMatch === m.id ? 'var(--mm)' : 'var(--text)' }}>
                        Match {m.match_number}
                      </div>
                      <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        vs {m.opponent.split(' ').slice(0, 2).join(' ')}
                      </div>
                      <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{formatMatchDate(m.date)}</div>
                      {m.is_played && (
                        <div className="font-mono text-xs mt-1"
                          style={{ color: m.result === 'won' ? 'var(--green)' : m.result === 'lost' ? 'var(--red)' : 'var(--text3)' }}>
                          {m.result?.toUpperCase()}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>

              {selectedMatch && (
                <>
                  {/* STEP 2 — CSV Upload */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
                    className="rounded-xl p-5 mb-6"
                    style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    <div className="font-mono text-xs tracking-[3px] uppercase mb-1" style={{ color: 'var(--text3)' }}>2. Upload CricClub CSV</div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text3)' }}>
                      Exports both MVCC + opponent stats automatically.
                    </p>
                    <div
                      className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                      style={{ borderColor: parsedCount > 0 ? 'var(--green)' : 'var(--border2)', background: 'rgba(255,255,255,0.02)' }}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCSVUploadFull(f) }}
                    >
                      <div className="text-4xl mb-3">{parsedCount > 0 ? '✅' : '📊'}</div>
                      <div className="font-display text-xl tracking-wider mb-1" style={{ color: 'var(--text)' }}>
                        {parsing ? 'PARSING...' : parsedCount > 0 ? `${parsedCount} PLAYERS LOADED` : 'DROP CSV HERE'}
                      </div>
                      <div className="font-mono text-xs" style={{ color: parsedCount > 0 ? 'var(--green)' : 'var(--text3)' }}>
                        {parseMsg || 'or click to browse · CricClub export CSV'}
                      </div>
                      <input ref={fileRef} type="file" accept=".csv" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVUploadFull(f); e.target.value = '' }} />
                    </div>

                    {lastParsed && lastParsed.opponent_batting.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                          <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>
                            Opp Batting ({lastParsed.opponent_batting.length})
                          </div>
                          {lastParsed.opponent_batting.slice(0, 4).map((b, i) => (
                            <div key={i} className="flex justify-between text-xs py-0.5">
                              <span style={{ color: 'var(--text2)' }}>{b.player_name.split(' ')[0]}</span>
                              <span className="font-mono" style={{ color: 'var(--hb)' }}>{b.runs} ({b.balls})</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                          <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>
                            Opp Bowling ({lastParsed.opponent_bowling.length})
                          </div>
                          {lastParsed.opponent_bowling.slice(0, 4).map((b, i) => (
                            <div key={i} className="flex justify-between text-xs py-0.5">
                              <span style={{ color: 'var(--text2)' }}>{b.player_name.split(' ')[0]}</span>
                              <span className="font-mono" style={{ color: 'var(--hb)' }}>{b.wickets}/{b.runs_conceded} ({b.overs})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {lastParsed && (lastParsed.mvcc_extras.total_extras > 0 || lastParsed.opponent_extras.total_extras > 0 || lastParsed.mvcc_fow.length > 0 || lastParsed.opponent_fow.length > 0) && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                          <div className="font-mono text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--mm)' }}>
                            MVCC innings
                          </div>
                          <div className="font-mono text-[11px]" style={{ color: 'var(--text2)' }}>
                            Extras: {lastParsed.mvcc_extras.total_extras} (b {lastParsed.mvcc_extras.byes}, lb {lastParsed.mvcc_extras.leg_byes}, w {lastParsed.mvcc_extras.wides}, nb {lastParsed.mvcc_extras.no_balls}, p {lastParsed.mvcc_extras.penalty})
                          </div>
                          {lastParsed.mvcc_fow.length > 0 && (
                            <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                              FOW: {lastParsed.mvcc_fow.map(f => `${f.wicket_number}-${f.score}`).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                          <div className="font-mono text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--hb)' }}>
                            Opponent innings
                          </div>
                          <div className="font-mono text-[11px]" style={{ color: 'var(--text2)' }}>
                            Extras: {lastParsed.opponent_extras.total_extras} (b {lastParsed.opponent_extras.byes}, lb {lastParsed.opponent_extras.leg_byes}, w {lastParsed.opponent_extras.wides}, nb {lastParsed.opponent_extras.no_balls}, p {lastParsed.opponent_extras.penalty})
                          </div>
                          {lastParsed.opponent_fow.length > 0 && (
                            <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                              FOW: {lastParsed.opponent_fow.map(f => `${f.wicket_number}-${f.score}`).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* STEP 3 — Match result */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                    className="rounded-xl p-5 mb-6"
                    style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>3. Confirm Match Result</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {(['won', 'lost', 'tied', 'no_result'] as const).map(r => (
                        <button key={r} onClick={() => setMatchResult(r)}
                          className="py-2 px-4 rounded-xl font-mono text-xs tracking-widest uppercase transition-all"
                          style={{
                            background: matchResult === r ? 'rgba(255,255,255,0.08)' : 'transparent',
                            border: `1px solid ${matchResult === r ? 'var(--border2)' : 'var(--border)'}`,
                            color: matchResult === r ? (r === 'won' ? 'var(--green)' : r === 'lost' ? 'var(--red)' : 'var(--text)') : 'var(--text3)',
                            cursor: 'pointer',
                          }}>
                          {r.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-xs tracking-widest block mb-1.5" style={{ color: 'var(--text3)' }}>MVCC SCORE</label>
                        <input value={mvccScore} onChange={e => setMvccScore(e.target.value)} placeholder="e.g. 145/6 (30 Overs)"
                          className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                      </div>
                      <div>
                        <label className="font-mono text-xs tracking-widest block mb-1.5" style={{ color: 'var(--text3)' }}>OPPONENT SCORE</label>
                        <input value={opponentScore} onChange={e => setOpponentScore(e.target.value)} placeholder="e.g. 132/8 (30 Overs)"
                          className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                      </div>
                    </div>
                  </motion.div>

                  {/* STEP 4 — Player stats */}
                  <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>4. Review & Edit Stats</div>
                  {[
                    { label: '🟡 MIGHTY MAVERICKS', players: mmPlayers },
                    { label: '🔵 HELL BOYS',        players: hbPlayers },
                  ].map(team => (
                    <motion.div
                      key={team.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                      className="rounded-xl overflow-hidden mb-6"
                      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                      <div className="px-5 py-3 font-display text-xl tracking-wider"
                        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                        {team.label}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {['Player', 'Runs', 'Balls', 'Overs', 'R.Con', 'Wkts', 'Cts', 'RO-F', 'RO-H', 'Stmp', 'POTM', 'EXT'].map(h => (
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
                                    <div className="font-medium flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                                      {player.short_name}
                                      {player.is_external && (
                                        <span className="font-mono" style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.3)' }}>EXT</span>
                                      )}
                                    </div>
                                    <div className="font-display text-xs" style={{ color: pts.total_points > 0 ? 'var(--mm)' : 'var(--text3)' }}>
                                      {pts.total_points} pts
                                    </div>
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
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={player.is_external}
                                      onChange={e => toggleExternal(player.id, e.target.checked)}
                                      style={{ accentColor: '#F59E0B', cursor: 'pointer' }}
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  ))}

                  {/* SAVE */}
                  <AnimatePresence mode="wait">
                    <motion.button
                      key={saved ? 'saved' : saving ? 'saving' : 'idle'}
                      onClick={handleSave}
                      disabled={saving}
                      whileHover={!saving && !saved ? { scale: 1.005 } : {}}
                      whileTap={!saving && !saved ? { scale: 0.985 } : {}}
                      initial={{ opacity: 0, y: 8 }}
                      animate={saved
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 1, y: 0 }}
                      transition={saved
                        ? { type: 'spring', stiffness: 320, damping: 18 }
                        : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      className="w-full py-4 rounded-xl font-display text-2xl tracking-wider relative overflow-hidden"
                      style={{
                        background: saved
                          ? 'linear-gradient(90deg, #4ADE80, #22c55e)'
                          : 'linear-gradient(90deg, #c9a84c 0%, #f0d080 50%, #c9a84c 100%)',
                        backgroundSize: '200% auto',
                        animation: !saving && !saved ? 'shimmer 3.5s linear infinite' : undefined,
                        color: '#0B1020',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.75 : 1,
                        boxShadow: saved ? '0 0 30px rgba(74,222,128,0.5)' : '0 8px 28px rgba(201,168,76,0.35)',
                      }}
                    >
                      {saving ? 'SAVING...' : saved ? '✓ SAVED!' : 'SAVE SCORECARD'}
                    </motion.button>
                  </AnimatePresence>

                  {saveError && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-xl px-4 py-3 font-mono text-xs"
                      style={{
                        background: 'rgba(244,63,94,0.10)',
                        border: '1px solid rgba(244,63,94,0.35)',
                        color: 'var(--red)',
                      }}
                    >
                      ⚠️ Save failed — {saveError}
                      <div className="mt-1" style={{ color: 'var(--text3)' }}>
                        Check the browser console for full details, and make sure all DB migrations have run.
                      </div>
                    </motion.div>
                  )}

                </>
              )}
            </motion.div>
          )}

          {tab === 'availability' && (
            <motion.div
              key="availability"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              <AvailabilityPanel
                players={players}
                matches={matches}
                matchId={availMatchId}
                setMatchId={setAvailMatchId}
                rows={availRows}
                loading={availLoading}
                playing12={playing12}
                setPlaying12={setPlaying12}
                onSave={handleSavePlaying12}
                saving={p12Saving}
                saved={p12Saved}
                onOverride={handleOverrideAvailability}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// AVAILABILITY PANEL
// ───────────────────────────────────────────────────────────────

function AvailabilityPanel({
  players, matches, matchId, setMatchId, rows, loading, playing12, setPlaying12, onSave, saving, saved, onOverride,
}: {
  players: Player[]
  matches: Match[]
  matchId: number | null
  setMatchId: (id: number | null) => void
  rows: Availability[]
  loading: boolean
  playing12: number[]
  setPlaying12: (ids: number[]) => void
  onSave: () => void
  saving: boolean
  saved: boolean
  onOverride: (playerId: number, status: AvailabilityStatus | null) => Promise<void>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = matches.filter(m => m.date >= today || !m.is_played)

  const byPlayer = new Map<number, Availability>()
  for (const r of rows) byPlayer.set(r.player_id, r)

  const counts = {
    available: rows.filter(r => r.status === 'available').length,
    not_available: rows.filter(r => r.status === 'not_available').length,
    tentative: rows.filter(r => r.status === 'tentative').length,
  }

  const availablePlayers = players.filter(p => byPlayer.get(p.id)?.status === 'available')

  function toggleP12(id: number) {
    if (playing12.includes(id)) {
      setPlaying12(playing12.filter(x => x !== id))
    } else {
      if (playing12.length >= 12) return
      setPlaying12([...playing12, id])
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Match selector */}
      <div className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>Match</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {upcoming.map(m => {
            const active = matchId === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMatchId(m.id)}
                className="p-3 rounded-xl text-left"
                style={{
                  background: active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'background 200ms ease, border-color 200ms ease',
                }}
              >
                <div className="font-display text-lg" style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>
                  Match {m.match_number}
                </div>
                <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                  vs {m.opponent.split(' ').slice(0, 2).join(' ')}
                </div>
                <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{formatMatchDate(m.date)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {matchId && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat label="Submitted" value={`${rows.length}/${players.length}`} color="var(--accent)" />
            <SummaryStat label="Available" value={counts.available} color="var(--green)" />
            <SummaryStat label="Tentative" value={counts.tentative} color="var(--gold)" />
            <SummaryStat label="Not Available" value={counts.not_available} color="var(--red)" />
          </div>

          {/* Player list */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div className="px-5 py-3 font-mono text-xs tracking-[3px] uppercase"
              style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}>
              Responses
            </div>
            {loading ? (
              <div className="p-6 text-center font-mono text-xs" style={{ color: 'var(--text3)' }}>LOADING…</div>
            ) : (
              <div>
                {players.map(p => {
                  const r = byPlayer.get(p.id)
                  const meta = r ? STATUS_META[r.status] : NO_RESPONSE_META
                  const email = emailForShortName(p.short_name)
                  const isNaveen = !email // Naveen has no Google email registered yet
                  return (
                    <div key={p.id} className="px-5 py-3"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-3">
                        <span style={{ fontSize: 18, lineHeight: 1.2 }}>{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{p.short_name}</span>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>
                              · {p.team === 'MM' ? 'MM' : 'HB'}
                            </span>
                            {p.is_external && (
                              <span className="font-mono" style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.3)' }}>EXT</span>
                            )}
                          </div>
                          {email && (
                            <div className="font-mono text-[10px] mt-0.5 truncate" style={{ color: 'var(--text3)' }}>
                              {email}
                            </div>
                          )}
                          {isNaveen && (
                            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--gold)' }}>
                              ⚠️ No email registered — admin must set availability manually.
                            </div>
                          )}
                          {!r && email && (
                            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                              Not signed in yet
                            </div>
                          )}
                          {r?.note && (
                            <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>&ldquo;{r.note}&rdquo;</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-[11px] tracking-widest" style={{ color: meta.color }}>
                            {meta.label}
                          </div>
                          {r?.submitted_at && (
                            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                              {new Date(r.submitted_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Inline override row */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap pl-7">
                        <span className="font-mono text-[10px] tracking-widest uppercase mr-1" style={{ color: 'var(--text3)' }}>
                          Override:
                        </span>
                        {([
                          { s: 'available' as AvailabilityStatus, label: '✅', color: 'var(--green)', dim: 'var(--green-dim)', border: 'rgba(74,222,128,0.4)' },
                          { s: 'tentative' as AvailabilityStatus, label: '🤔', color: 'var(--gold)', dim: 'var(--gold-dim)', border: 'rgba(245,158,11,0.4)' },
                          { s: 'not_available' as AvailabilityStatus, label: '❌', color: 'var(--red)', dim: 'var(--red-dim)', border: 'rgba(244,63,94,0.4)' },
                        ]).map(opt => {
                          const active = r?.status === opt.s
                          return (
                            <button
                              key={opt.s}
                              onClick={() => onOverride(p.id, opt.s)}
                              className="px-2 py-1 rounded-md text-xs"
                              style={{
                                background: active ? opt.dim : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${active ? opt.border : 'var(--border)'}`,
                                color: active ? opt.color : 'var(--text2)',
                                cursor: 'pointer',
                                transition: 'background 200ms ease, border-color 200ms ease',
                              }}
                              title={`Set ${p.short_name} to ${opt.s}`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                        {r && (
                          <button
                            onClick={() => onOverride(p.id, null)}
                            className="px-2 py-1 rounded-md font-mono text-[10px] tracking-widest uppercase"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border)',
                              color: 'var(--text3)',
                              cursor: 'pointer',
                            }}
                            title={`Clear ${p.short_name}'s response`}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Playing 12 picker */}
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-mono text-xs tracking-[3px] uppercase" style={{ color: 'var(--text3)' }}>
                Playing 12
              </div>
              <div className="font-display text-2xl" style={{ color: playing12.length === 12 ? 'var(--green)' : 'var(--accent)' }}>
                {playing12.length}/12
              </div>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>
              Only available players can be picked. Available players left out automatically earn +10 availability points.
            </p>

            {availablePlayers.length === 0 ? (
              <div className="text-center py-6 font-mono text-xs" style={{ color: 'var(--text3)' }}>
                No available players yet — waiting on submissions.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availablePlayers.map(p => {
                  const picked = playing12.includes(p.id)
                  const teamColor = p.team === 'MM' ? 'var(--mm)' : 'var(--hb)'
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleP12(p.id)}
                      disabled={!picked && playing12.length >= 12}
                      className="px-3 py-2 rounded-lg text-left flex items-center gap-2"
                      style={{
                        background: picked ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${picked ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`,
                        color: 'var(--text)',
                        cursor: (!picked && playing12.length >= 12) ? 'not-allowed' : 'pointer',
                        opacity: (!picked && playing12.length >= 12) ? 0.5 : 1,
                        transition: 'background 200ms ease, border-color 200ms ease',
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: 4, border: '1px solid var(--border2)', background: picked ? 'var(--green)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#0B1020' }}>
                        {picked ? '✓' : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: teamColor, display: 'inline-block' }} />
                        <span className="text-sm">{p.short_name}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <motion.button
              onClick={onSave}
              disabled={saving || !matchId}
              whileTap={!saving ? { scale: 0.99 } : {}}
              className="w-full mt-5 py-3 rounded-xl font-display text-lg tracking-wider"
              style={{
                background: saved
                  ? 'linear-gradient(90deg, #4ADE80, #22c55e)'
                  : 'linear-gradient(90deg, #00E5FF, #38bdf8)',
                color: '#0B1020',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: saved ? '0 0 28px rgba(74,222,128,0.45)' : '0 6px 22px rgba(0,229,255,0.3)',
              }}
            >
              {saving ? 'SAVING…' : saved ? '✓ PLAYING 12 SAVED' : 'SAVE PLAYING 12'}
            </motion.button>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center"
      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}>
      <div className="font-display text-3xl" style={{ color }}>{value}</div>
      <div className="font-mono text-[10px] tracking-widest uppercase mt-1" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
    </div>
  )
}

const STATUS_META: Record<AvailabilityStatus, { label: string; emoji: string; color: string }> = {
  available:     { label: 'AVAILABLE',     emoji: '✅', color: 'var(--green)' },
  tentative:     { label: 'TENTATIVE',     emoji: '🤔', color: 'var(--gold)' },
  not_available: { label: 'NOT AVAILABLE', emoji: '❌', color: 'var(--red)' },
}
const NO_RESPONSE_META = { label: 'NO RESPONSE', emoji: '⬜', color: 'var(--text3)' }
