'use client'

import { useState, useEffect } from 'react'
import { supabase, Match } from '@/lib/supabase'
import Nav from '@/components/Nav'
import ScheduleCard from '@/components/ScheduleCard'

export default function SchedulePage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .order('date')
      .then(({ data }) => {
        if (data) setMatches(data)
        setLoading(false)
      })
  }, [])

  const played = matches.filter(m => m.is_played)
  const upcoming = matches.filter(m => !m.is_played)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-[4px] uppercase mb-2" style={{ color: 'var(--text3)' }}>
            Season 2026 · T30 Internal
          </p>
          <h1 className="font-display text-5xl tracking-wider" style={{ color: 'var(--text)' }}>
            SCHEDULE
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="font-mono text-xs tracking-[4px] uppercase" style={{ color: 'var(--text3)' }}>
              Loading schedule...
            </div>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>
                  Upcoming Matches
                </div>
                <div className="flex flex-col gap-3">
                  {upcoming.map(m => <ScheduleCard key={m.id} match={m} />)}
                </div>
              </div>
            )}

            {played.length > 0 && (
              <div>
                <div className="font-mono text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--text3)' }}>
                  Completed Matches
                </div>
                <div className="flex flex-col gap-3">
                  {played.map(m => <ScheduleCard key={m.id} match={m} />)}
                </div>
              </div>
            )}

            {matches.length === 0 && (
              <div
                className="text-center py-16 rounded-xl"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                <div className="text-4xl mb-3">📅</div>
                <p className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                  NO MATCHES SCHEDULED YET
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
