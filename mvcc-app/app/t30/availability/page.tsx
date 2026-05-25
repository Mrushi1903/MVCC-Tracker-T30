'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, fetchTournament, Player, Match, AvailabilityStatus } from '@/lib/supabase'
import Nav from '@/components/Nav'

const TEAM_PIN = 'MVCC2026'

type Step = 'pin' | 'player' | 'match' | 'status' | 'confirm' | 'done'

export default function AvailabilityPage() {
  const [step, setStep] = useState<Step>('pin')
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedMatch,  setSelectedMatch]  = useState<Match | null>(null)
  const [status,         setStatus]         = useState<AvailabilityStatus | null>(null)
  const [note,           setNote]           = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Pre-fetch players + upcoming matches once unlocked.
  useEffect(() => {
    if (step === 'pin') return
    if (players.length && matches.length) return
    ;(async () => {
      setLoading(true)
      const today = new Date().toISOString().slice(0, 10)
      const tournament = await fetchTournament('T30')
      const matchesQuery = supabase
        .from('matches')
        .select('*')
        .gte('date', today)
        .order('date')
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from('players').select('*').order('team').order('name'),
        tournament
          ? matchesQuery.eq('tournament_id', tournament.id)
          : matchesQuery,
      ])
      if (p) setPlayers(p as Player[])
      if (m) setMatches(m as Match[])
      setLoading(false)
    })()
  }, [step, players.length, matches.length])

  function submitPin(e: React.FormEvent) {
    e.preventDefault()
    if (pinInput.trim().toUpperCase() === TEAM_PIN) {
      setPinError(false)
      setStep('player')
    } else {
      setPinError(true)
    }
  }

  async function handleSubmit() {
    if (!selectedPlayer || !selectedMatch || !status) return
    setSubmitting(true)
    setSubmitError(null)
    const { error } = await supabase
      .from('availability')
      .upsert(
        {
          match_id: selectedMatch.id,
          player_id: selectedPlayer.id,
          status,
          note: note.trim() || null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'match_id,player_id' },
      )
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
    } else {
      setStep('done')
    }
  }

  function resetFlow() {
    setSelectedPlayer(null)
    setSelectedMatch(null)
    setStatus(null)
    setNote('')
    setSubmitError(null)
    setStep('player')
  }

  return (
    <div style={{ background: '#0B1020', minHeight: '100vh', position: 'relative' }}>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-8 pb-32">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="mb-6"
        >
          <p className="font-mono text-xs tracking-[4px] uppercase mb-2" style={{ color: 'var(--accent)' }}>
            Player Form
          </p>
          <h1 className="font-display tracking-widest" style={{ fontSize: 'clamp(40px, 8vw, 64px)', lineHeight: 1, color: 'var(--text)' }}>
            AVAILABILITY
          </h1>
          <div style={{ width: 64, height: 3, background: 'linear-gradient(90deg, var(--accent), transparent)', borderRadius: 99, marginTop: 12 }} />
          <p className="font-mono text-xs mt-4" style={{ color: 'var(--text3)' }}>
            Submit your availability for upcoming MVCC matches. Captains review and pick the Playing 12.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'pin' && (
            <StepShell key="pin">
              <StepHeader label="Step 1" title="Enter team PIN" />
              <form onSubmit={submitPin}>
                <input
                  autoFocus
                  type="password"
                  inputMode="text"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value); setPinError(false) }}
                  placeholder="Team PIN"
                  className="w-full px-4 py-3 rounded-xl font-mono text-base tracking-widest outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${pinError ? 'var(--red)' : 'var(--border2)'}`,
                    color: 'var(--text)',
                  }}
                />
                {pinError && (
                  <div className="font-mono text-xs mt-2" style={{ color: 'var(--red)' }}>
                    Incorrect PIN. Ask a captain or check the team group.
                  </div>
                )}
                <PrimaryButton type="submit" disabled={!pinInput}>Unlock</PrimaryButton>
              </form>
            </StepShell>
          )}

          {step === 'player' && (
            <StepShell key="player">
              <StepHeader label="Step 2" title="Who are you?" />
              {loading ? (
                <Loader />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {players.map(pl => {
                    const active = selectedPlayer?.id === pl.id
                    const teamColor = pl.team === 'MM' ? 'var(--mm)' : 'var(--hb)'
                    const dim = pl.team === 'MM' ? 'var(--mm-dim)' : 'var(--hb-dim)'
                    const border = pl.team === 'MM' ? 'var(--mm-border)' : 'var(--hb-border)'
                    return (
                      <motion.button
                        key={pl.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedPlayer(pl)}
                        className="px-3 py-2.5 rounded-xl text-left"
                        style={{
                          background: active ? dim : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? border : 'var(--border)'}`,
                          color: 'var(--text)',
                          cursor: 'pointer',
                          transition: 'background 200ms ease, border-color 200ms ease',
                        }}
                      >
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: teamColor, display: 'inline-block' }} />
                          {pl.short_name}
                        </div>
                        <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                          {pl.team === 'MM' ? 'Mighty Mavericks' : 'Hell Boys'}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
              <PrimaryButton onClick={() => setStep('match')} disabled={!selectedPlayer}>
                Continue
              </PrimaryButton>
            </StepShell>
          )}

          {step === 'match' && (
            <StepShell key="match">
              <StepHeader label="Step 3" title="Which match?" />
              {loading ? (
                <Loader />
              ) : matches.length === 0 ? (
                <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                  <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                    No upcoming matches.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {matches.map(m => {
                    const active = selectedMatch?.id === m.id
                    const [y, mo, d] = m.date.split('-').map(Number)
                    const dt = new Date(y, mo - 1, d)
                    return (
                      <motion.button
                        key={m.id}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedMatch(m)}
                        className="rounded-xl px-4 py-3 text-left flex items-center gap-3"
                        style={{
                          background: active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                          cursor: 'pointer',
                          transition: 'background 200ms ease, border-color 200ms ease',
                        }}
                      >
                        <div className="font-display text-2xl w-10 text-center"
                          style={{ color: active ? 'var(--accent)' : 'var(--text2)' }}>
                          {m.match_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                            vs {m.opponent}
                          </div>
                          <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                            {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {m.time} · {m.ground}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <SecondaryButton onClick={() => setStep('player')}>Back</SecondaryButton>
                <PrimaryButton onClick={() => setStep('status')} disabled={!selectedMatch}>
                  Continue
                </PrimaryButton>
              </div>
            </StepShell>
          )}

          {step === 'status' && (
            <StepShell key="status">
              <StepHeader label="Step 4" title="Will you play?" />
              <div className="flex flex-col gap-2">
                {(['available', 'tentative', 'not_available'] as const).map(s => {
                  const meta = STATUS_META[s]
                  const active = status === s
                  return (
                    <motion.button
                      key={s}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setStatus(s)}
                      className="rounded-xl px-4 py-3 text-left flex items-center gap-3"
                      style={{
                        background: active ? meta.dim : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? meta.border : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'background 200ms ease, border-color 200ms ease',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{meta.emoji}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{ color: active ? meta.color : 'var(--text)' }}>
                          {meta.label}
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
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Anything captains should know — work, travel, injury, late arrival..."
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
                <SecondaryButton onClick={() => setStep('match')}>Back</SecondaryButton>
                <PrimaryButton onClick={() => setStep('confirm')} disabled={!status}>
                  Review
                </PrimaryButton>
              </div>
            </StepShell>
          )}

          {step === 'confirm' && selectedPlayer && selectedMatch && status && (
            <StepShell key="confirm">
              <StepHeader label="Step 5" title="Confirm" />
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border2)' }}>
                <Row label="Player" value={selectedPlayer.short_name} />
                <Row label="Match" value={`#${selectedMatch.match_number} vs ${selectedMatch.opponent}`} />
                <Row label="Status" value={STATUS_META[status].label} color={STATUS_META[status].color} />
                {note.trim() && <Row label="Note" value={note.trim()} />}
              </div>
              {submitError && (
                <div className="font-mono text-xs mt-3" style={{ color: 'var(--red)' }}>
                  {submitError}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <SecondaryButton onClick={() => setStep('status')} disabled={submitting}>Back</SecondaryButton>
                <PrimaryButton onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit'}
                </PrimaryButton>
              </div>
              <p className="font-mono text-[11px] mt-3" style={{ color: 'var(--text3)' }}>
                Submitting again for the same match updates your previous response.
              </p>
            </StepShell>
          )}

          {step === 'done' && selectedPlayer && selectedMatch && status && (
            <StepShell key="done">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="text-center py-6"
              >
                <div style={{ fontSize: 64, marginBottom: 12 }}>{STATUS_META[status].emoji}</div>
                <div className="font-display text-3xl tracking-wider mb-2" style={{ color: 'var(--text)' }}>
                  GOT IT, {selectedPlayer.short_name.toUpperCase()}
                </div>
                <p className="font-mono text-xs mb-6" style={{ color: 'var(--text3)' }}>
                  Recorded as <span style={{ color: STATUS_META[status].color }}>{STATUS_META[status].label}</span>
                  {' '}for Match #{selectedMatch.match_number} vs {selectedMatch.opponent}.
                </p>
                <SecondaryButton onClick={resetFlow}>Submit another response</SecondaryButton>
              </motion.div>
            </StepShell>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

const STATUS_META: Record<AvailabilityStatus, { label: string; emoji: string; color: string; dim: string; border: string; help: string }> = {
  available: {
    label: 'Available',
    emoji: '✅',
    color: 'var(--green)',
    dim: 'var(--green-dim)',
    border: 'rgba(74,222,128,0.4)',
    help: 'I can play the full match.',
  },
  tentative: {
    label: 'Tentative',
    emoji: '🤔',
    color: 'var(--gold)',
    dim: 'var(--gold-dim)',
    border: 'rgba(245,158,11,0.4)',
    help: 'Not sure yet — leave a note below.',
  },
  not_available: {
    label: 'Not available',
    emoji: '❌',
    color: 'var(--red)',
    dim: 'var(--red-dim)',
    border: 'rgba(244,63,94,0.4)',
    help: "I can't make this one.",
  },
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
  type?: 'button' | 'submit'
}

function PrimaryButton({ children, onClick, disabled, type = 'button' }: BtnProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.985 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-4 py-3 rounded-xl font-display text-lg tracking-wider"
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
      type="button"
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
    <div className="text-center py-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid var(--border2)', borderTop: '2px solid var(--accent)',
          margin: '0 auto 8px',
        }}
      />
      <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>LOADING</div>
    </div>
  )
}
