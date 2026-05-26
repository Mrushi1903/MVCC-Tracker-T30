'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, Player, Match, Availability, AvailabilityStatus } from '@/lib/supabase'
import { lookupPlayerByEmail } from '@/lib/playerEmails'
import { getOpponentLogo, getOpponentInitials } from '@/lib/opponentLogos'
import Nav from '@/components/Nav'

type Step = 'signin' | 'denied' | 'match' | 'status' | 'confirm' | 'done'

export default function AvailabilityPage() {
  const [authChecked, setAuthChecked] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [playerShortName, setPlayerShortName] = useState<string | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [existingByMatch, setExistingByMatch] = useState<Map<number, Availability>>(new Map())
  const [loadingData, setLoadingData] = useState(false)

  const [step, setStep] = useState<Step>('signin')
  const [signingIn, setSigningIn] = useState(false)

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [status, setStatus] = useState<AvailabilityStatus | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Resolve auth state on mount + on every auth change.
  useEffect(() => {
    let mounted = true

    async function refreshAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      const email = session?.user?.email ?? null
      setUserEmail(email)
      const lookup = lookupPlayerByEmail(email)
      setPlayerShortName(lookup)
      setAuthChecked(true)
      if (!email) setStep('signin')
      else if (!lookup) setStep('denied')
      else setStep(prev => (prev === 'signin' || prev === 'denied') ? 'match' : prev)
    }

    refreshAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refreshAuth())
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  // Once authed and matched to a player, fetch the player row + upcoming
  // matches + their existing availability responses.
  useEffect(() => {
    if (!playerShortName) return
    let cancelled = false

    ;(async () => {
      setLoadingData(true)
      const today = new Date().toISOString().slice(0, 10)
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from('players').select('*').eq('short_name', playerShortName).maybeSingle(),
        supabase.from('matches').select('*').gte('date', today).order('date'),
      ])
      if (cancelled) return
      const playerRow = (p as Player | null) ?? null
      const matchRows = (m as Match[] | null) ?? []
      setPlayer(playerRow)
      setMatches(matchRows)

      if (playerRow && matchRows.length > 0) {
        const { data: avail } = await supabase
          .from('availability')
          .select('*')
          .eq('player_id', playerRow.id)
          .in('match_id', matchRows.map(mm => mm.id))
        if (cancelled) return
        const map = new Map<number, Availability>()
        for (const a of (avail as Availability[] | null) ?? []) map.set(a.match_id, a)
        setExistingByMatch(map)
      }

      setLoadingData(false)
    })()

    return () => { cancelled = true }
  }, [playerShortName])

  async function handleGoogleSignIn() {
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/t30/availability`,
      },
    })
    if (error) {
      console.error(error)
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUserEmail(null)
    setPlayerShortName(null)
    setPlayer(null)
    setMatches([])
    setExistingByMatch(new Map())
    setSelectedMatch(null)
    setStatus(null)
    setNote('')
    setStep('signin')
  }

  function pickMatch(m: Match) {
    setSelectedMatch(m)
    const existing = existingByMatch.get(m.id)
    if (existing) {
      setStatus(existing.status)
      setNote(existing.note ?? '')
    } else {
      setStatus(null)
      setNote('')
    }
    setStep('status')
  }

  async function handleSubmit() {
    if (!player || !selectedMatch || !status) return
    setSubmitting(true)
    setSubmitError(null)
    const { error } = await supabase
      .from('availability')
      .upsert(
        {
          match_id: selectedMatch.id,
          player_id: player.id,
          status,
          note: note.trim() || null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'match_id,player_id' },
      )
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    // Refresh local cache so this match shows the new status if they go back.
    setExistingByMatch(prev => {
      const next = new Map(prev)
      next.set(selectedMatch.id, {
        id: 0,
        tournament_id: selectedMatch.tournament_id,
        match_id: selectedMatch.id,
        player_id: player.id,
        status,
        note: note.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      return next
    })
    setStep('done')
  }

  function resetForAnother() {
    setSelectedMatch(null)
    setStatus(null)
    setNote('')
    setSubmitError(null)
    setStep('match')
  }

  return (
    <div style={{ background: '#0B1020', minHeight: '100vh', position: 'relative' }}>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-8 pb-32">
        {!authChecked ? (
          <Loader />
        ) : (
          <>
            <Header email={userEmail} playerName={playerShortName} onSignOut={handleSignOut} />

            <AnimatePresence mode="wait">
              {step === 'signin' && (
                <SignInCard key="signin" onSignIn={handleGoogleSignIn} signingIn={signingIn} />
              )}

              {step === 'denied' && userEmail && (
                <DeniedCard key="denied" email={userEmail} onSignOut={handleSignOut} />
              )}

              {step === 'match' && (
                loadingData ? <Loader key="loading" /> : (
                  <MatchPicker
                    key="match"
                    matches={matches}
                    existingByMatch={existingByMatch}
                    onPick={pickMatch}
                  />
                )
              )}

              {step === 'status' && selectedMatch && (
                <StatusPicker
                  key="status"
                  match={selectedMatch}
                  status={status}
                  setStatus={setStatus}
                  note={note}
                  setNote={setNote}
                  onBack={() => setStep('match')}
                  onContinue={() => setStep('confirm')}
                />
              )}

              {step === 'confirm' && selectedMatch && status && playerShortName && (
                <ConfirmCard
                  key="confirm"
                  playerShortName={playerShortName}
                  match={selectedMatch}
                  status={status}
                  note={note}
                  submitting={submitting}
                  submitError={submitError}
                  onBack={() => setStep('status')}
                  onSubmit={handleSubmit}
                />
              )}

              {step === 'done' && selectedMatch && status && playerShortName && (
                <DoneCard
                  key="done"
                  playerShortName={playerShortName}
                  match={selectedMatch}
                  status={status}
                  onAnother={resetForAnother}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Header strip
// ───────────────────────────────────────────────────────────────
function Header({ email, playerName, onSignOut }: { email: string | null; playerName: string | null; onSignOut: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="mb-6"
    >
      <p className="font-mono text-xs tracking-[4px] uppercase mb-2" style={{ color: 'var(--accent)' }}>
        Player Form
      </p>
      <h1 className="font-display tracking-widest" style={{ fontSize: 'clamp(40px, 8vw, 64px)', lineHeight: 1, color: 'var(--text)' }}>
        AVAILABILITY
      </h1>
      <div style={{ width: 64, height: 3, background: 'linear-gradient(90deg, var(--accent), transparent)', borderRadius: 99, marginTop: 12 }} />
      {email && playerName ? (
        <div className="font-mono text-xs mt-4 flex items-center justify-between flex-wrap gap-2">
          <span style={{ color: 'var(--text3)' }}>
            Signed in as <span style={{ color: 'var(--green)' }}>{playerName}</span>{' '}
            <span style={{ color: 'var(--text3)' }}>({email})</span>
          </span>
          <button
            onClick={onSignOut}
            className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border2)',
              color: 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <p className="font-mono text-xs mt-4" style={{ color: 'var(--text3)' }}>
          Sign in with Google to confirm your availability for upcoming MVCC matches.
        </p>
      )}
    </motion.div>
  )
}

// ───────────────────────────────────────────────────────────────
// Step 1 — Google sign in
// ───────────────────────────────────────────────────────────────
function SignInCard({ onSignIn, signingIn }: { onSignIn: () => void; signingIn: boolean }) {
  return (
    <StepShell>
      <div className="flex flex-col items-center text-center pt-2">
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1.5px solid rgba(201,168,76,0.5)',
            boxShadow: '0 0 32px rgba(201,168,76,0.25)',
            marginBottom: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mavericks-logo.jpeg" alt="MVCC" className="w-full h-full object-cover" />
        </div>
        <div className="font-display text-2xl tracking-wider mb-2" style={{ color: 'var(--text)' }}>
          CONFIRM YOUR AVAILABILITY
        </div>
        <p className="font-mono text-xs mb-6" style={{ color: 'var(--text3)' }}>
          Only registered MVCC T30 players can sign in. Your Google email must match the one your captain registered for you.
        </p>
        <motion.button
          whileTap={signingIn ? undefined : { scale: 0.985 }}
          onClick={onSignIn}
          disabled={signingIn}
          className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3"
          style={{
            background: signingIn ? 'rgba(255,255,255,0.06)' : 'white',
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
          {signingIn ? 'Redirecting…' : 'Sign in with Google'}
        </motion.button>
      </div>
    </StepShell>
  )
}

// ───────────────────────────────────────────────────────────────
// Step 2 — Email not on the roster
// ───────────────────────────────────────────────────────────────
function DeniedCard({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <StepShell>
      <div className="text-center pt-2">
        <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
        <div className="font-display text-2xl tracking-wider mb-2" style={{ color: 'var(--red)' }}>
          NOT REGISTERED
        </div>
        <p className="text-sm mb-1" style={{ color: 'var(--text2)' }}>
          {email}
        </p>
        <p className="font-mono text-xs mb-6" style={{ color: 'var(--text3)' }}>
          This Google account is not registered as an MVCC T30 player. Contact your captain (Viswa or Rohith) to get added.
        </p>
        <button
          onClick={onSignOut}
          className="px-5 py-2 rounded-xl font-mono text-xs tracking-widest uppercase"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </StepShell>
  )
}

// ───────────────────────────────────────────────────────────────
// Step 3 — pick a match
// ───────────────────────────────────────────────────────────────
function MatchPicker({
  matches, existingByMatch, onPick,
}: {
  matches: Match[]
  existingByMatch: Map<number, Availability>
  onPick: (m: Match) => void
}) {
  if (matches.length === 0) {
    return (
      <StepShell>
        <div className="text-center py-8">
          <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
            No upcoming matches.
          </div>
        </div>
      </StepShell>
    )
  }

  return (
    <StepShell>
      <StepHeader label="Step 1" title="Which match?" />
      <motion.div
        className="flex flex-col gap-2"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {matches.map(m => (
          <motion.button
            key={m.id}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } } }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onPick(m)}
            className="rounded-xl p-3 flex items-center gap-3 text-left"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 200ms ease, border-color 200ms ease',
            }}
          >
            <OpponentLogo opponent={m.opponent} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm flex items-center gap-2 flex-wrap" style={{ color: 'var(--text)' }}>
                <span>Match {m.match_number}</span>
                <span style={{ color: 'var(--text3)' }}>·</span>
                <span style={{ color: 'var(--text)' }}>vs {m.opponent}</span>
              </div>
              <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                {formatMatchLine(m.date, m.time, m.ground)}
              </div>
              <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--accent)' }}>
                {countdownLabel(m.date)}
              </div>
            </div>
            <StatusBadge existing={existingByMatch.get(m.id) ?? null} />
          </motion.button>
        ))}
      </motion.div>
      <p className="font-mono text-[11px] mt-4 text-center" style={{ color: 'var(--text3)' }}>
        Already submitted? Pick the match again to update your response.
      </p>
    </StepShell>
  )
}

function OpponentLogo({ opponent }: { opponent: string }) {
  const src = getOpponentLogo(opponent)
  const initials = getOpponentInitials(opponent)
  if (src) {
    return (
      <div
        style={{
          width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
          border: '1px solid rgba(56,189,248,0.35)',
          flexShrink: 0,
        }}
      >
        <Image src={src} alt={opponent} width={44} height={44} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
      </div>
    )
  }
  return (
    <div
      style={{
        width: 44, height: 44, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(56,189,248,0.12)',
        border: '1px solid rgba(56,189,248,0.35)',
        color: 'var(--hb)',
        fontFamily: "'Bebas Neue', cursive",
        fontSize: 16,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

function StatusBadge({ existing }: { existing: Availability | null }) {
  if (!existing) {
    return (
      <span
        className="font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded-md flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text3)' }}
      >
        New
      </span>
    )
  }
  const meta = STATUS_META[existing.status]
  return (
    <span
      className="font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded-md flex-shrink-0"
      style={{ background: meta.dim, border: `1px solid ${meta.border}`, color: meta.color }}
    >
      {meta.shortLabel}
    </span>
  )
}

// ───────────────────────────────────────────────────────────────
// Step 4 — status + note
// ───────────────────────────────────────────────────────────────
function StatusPicker({
  match, status, setStatus, note, setNote, onBack, onContinue,
}: {
  match: Match
  status: AvailabilityStatus | null
  setStatus: (s: AvailabilityStatus) => void
  note: string
  setNote: (n: string) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <StepShell>
      <StepHeader label="Step 2" title={`Match ${match.match_number} vs ${match.opponent}`} />
      <p className="font-mono text-[11px] mb-4" style={{ color: 'var(--text3)' }}>
        {formatMatchLine(match.date, match.time, match.ground)}
      </p>

      <div className="flex flex-col gap-2">
        {(['available', 'tentative', 'not_available'] as const).map(s => {
          const meta = STATUS_META[s]
          const active = status === s
          return (
            <motion.button
              key={s}
              whileTap={{ scale: 0.99 }}
              onClick={() => setStatus(s)}
              className="rounded-xl px-4 py-4 text-left flex items-center gap-4"
              style={{
                minHeight: 72,
                background: active ? meta.dim : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? meta.border : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                boxShadow: active ? `0 0 24px ${meta.glow}` : 'none',
              }}
            >
              <span style={{ fontSize: 28 }}>{meta.emoji}</span>
              <div className="flex-1">
                <div className="font-display text-xl tracking-wider" style={{ color: active ? meta.color : 'var(--text)' }}>
                  {meta.label.toUpperCase()}
                </div>
                <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  {meta.help}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="mt-4">
        <label className="font-mono text-xs tracking-widest block mb-2" style={{ color: 'var(--text3)' }}>
          Any notes for the captain? (optional)
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. might be 10 mins late, knee a bit sore but should be fine..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border2)',
            color: 'var(--text)',
          }}
        />
      </div>

      <div className="flex gap-2 mt-4">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={onContinue} disabled={!status}>Review</PrimaryButton>
      </div>
    </StepShell>
  )
}

// ───────────────────────────────────────────────────────────────
// Step 5 — confirm
// ───────────────────────────────────────────────────────────────
function ConfirmCard({
  playerShortName, match, status, note, submitting, submitError, onBack, onSubmit,
}: {
  playerShortName: string
  match: Match
  status: AvailabilityStatus
  note: string
  submitting: boolean
  submitError: string | null
  onBack: () => void
  onSubmit: () => void
}) {
  const meta = STATUS_META[status]
  return (
    <StepShell>
      <StepHeader label="Step 3" title="Confirm" />
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border2)' }}>
        <Row label="Player" value={playerShortName} />
        <Row label="Match" value={`#${match.match_number} vs ${match.opponent}`} />
        <Row label="When" value={formatMatchLine(match.date, match.time, match.ground)} />
        <Row label="Status" value={meta.label} color={meta.color} />
        {note.trim() && <Row label="Note" value={note.trim()} />}
      </div>
      {submitError && (
        <div className="font-mono text-xs mt-3" style={{ color: 'var(--red)' }}>
          {submitError}
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <SecondaryButton onClick={onBack} disabled={submitting}>Back</SecondaryButton>
        <PrimaryButton onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </PrimaryButton>
      </div>
      <p className="font-mono text-[11px] mt-3" style={{ color: 'var(--text3)' }}>
        You can update this anytime before match day by submitting again.
      </p>
    </StepShell>
  )
}

// ───────────────────────────────────────────────────────────────
// Step 6 — done
// ───────────────────────────────────────────────────────────────
function DoneCard({
  playerShortName, match, status, onAnother,
}: {
  playerShortName: string
  match: Match
  status: AvailabilityStatus
  onAnother: () => void
}) {
  const meta = STATUS_META[status]
  return (
    <StepShell>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="text-center py-4"
      >
        <div style={{ fontSize: 64, marginBottom: 12 }}>{meta.emoji}</div>
        <div className="font-display text-3xl tracking-wider mb-2" style={{ color: 'var(--text)' }}>
          GOT IT, {playerShortName.toUpperCase()}
        </div>
        <p className="font-mono text-xs mb-2" style={{ color: 'var(--text3)' }}>
          Recorded as <span style={{ color: meta.color }}>{meta.label}</span> for Match #{match.match_number} vs {match.opponent}.
        </p>
        <p className="font-mono text-[11px] mb-6" style={{ color: 'var(--text3)' }}>
          Your captain has been notified. You can update this anytime before match day.
        </p>
        <SecondaryButton onClick={onAnother}>Submit for another match</SecondaryButton>
      </motion.div>
    </StepShell>
  )
}

// ───────────────────────────────────────────────────────────────
// Shared helpers
// ───────────────────────────────────────────────────────────────

const STATUS_META: Record<AvailabilityStatus, { label: string; shortLabel: string; emoji: string; color: string; dim: string; border: string; glow: string; help: string }> = {
  available: {
    label: 'Available',
    shortLabel: 'Avail',
    emoji: '✅',
    color: 'var(--green)',
    dim: 'var(--green-dim)',
    border: 'rgba(74,222,128,0.4)',
    glow: 'rgba(74,222,128,0.25)',
    help: 'I can play the full match.',
  },
  tentative: {
    label: 'Tentative',
    shortLabel: 'Tent',
    emoji: '🤔',
    color: 'var(--gold)',
    dim: 'var(--gold-dim)',
    border: 'rgba(245,158,11,0.4)',
    glow: 'rgba(245,158,11,0.25)',
    help: 'Not sure yet — leave a note below.',
  },
  not_available: {
    label: 'Not available',
    shortLabel: 'Out',
    emoji: '❌',
    color: 'var(--red)',
    dim: 'var(--red-dim)',
    border: 'rgba(244,63,94,0.4)',
    glow: 'rgba(244,63,94,0.25)',
    help: "I can't make this one.",
  },
}

function formatMatchLine(dateStr: string, time: string, ground: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  return `${dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${time} · ${ground}`
}

function countdownLabel(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const matchDate = new Date(y, mo - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((matchDate.getTime() - today.getTime()) / 86400000)
  if (days < 0) return 'In the past'
  if (days === 0) return 'TODAY'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {children}
    </motion.div>
  )
}

function StepHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] tracking-[4px] uppercase mb-1" style={{ color: 'var(--accent)' }}>
        {label}
      </div>
      <div className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>
        {title}
      </div>
    </div>
  )
}

type BtnProps = {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

function PrimaryButton({ children, onClick, disabled }: BtnProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.985 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-1 py-3 rounded-xl font-display text-lg tracking-wider"
      style={{
        background: disabled
          ? 'rgba(255,255,255,0.06)'
          : 'linear-gradient(90deg, #00E5FF, #38bdf8)',
        color: disabled ? 'var(--text3)' : '#0B1020',
        border: '1px solid rgba(0,229,255,0.4)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 6px 22px rgba(0,229,255,0.25)',
        transition: 'background 200ms ease, color 200ms ease, box-shadow 200ms ease',
      }}
    >
      {children}
    </motion.button>
  )
}

function SecondaryButton({ children, onClick, disabled }: BtnProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.985 }}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-3 rounded-xl font-mono text-xs tracking-widest uppercase"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border2)',
        color: 'var(--text2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </motion.button>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-start justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="font-mono text-[11px] tracking-widest uppercase" style={{ color: 'var(--text3)' }}>{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: color || 'var(--text)' }}>{value}</span>
    </div>
  )
}

function Loader() {
  return (
    <div className="text-center py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid var(--border2)', borderTop: '2px solid var(--accent)',
          margin: '0 auto 12px',
        }}
      />
      <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>LOADING</div>
    </div>
  )
}
