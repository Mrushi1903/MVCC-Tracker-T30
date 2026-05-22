'use client'
import { useState } from 'react'
import { Match } from '@/lib/supabase'
import ScorecardModal from '@/components/ScorecardModal'

export default function ScheduleCard({ match }: { match: Match }) {
  const [showScorecard, setShowScorecard] = useState(false)

  const [year, month, day] = match.date.split('-').map(Number)
  const date      = new Date(year, month - 1, day)
  const today     = new Date(); today.setHours(0,0,0,0)
  const matchDate = new Date(year, month - 1, day)
  const isToday   = matchDate.getTime() === today.getTime()

  const statusColor = match.is_played
    ? match.result === 'won'  ? 'var(--green)'
    : match.result === 'lost' ? 'var(--red)'
    : 'var(--text3)'
    : isToday ? 'var(--gold)' : 'var(--text3)'

  const statusLabel = match.is_played
    ? match.result === 'won'  ? 'WON'
    : match.result === 'lost' ? 'LOST'
    : match.result === 'tied' ? 'TIED' : 'PLAYED'
    : isToday ? 'TODAY' : 'UPCOMING'

  return (
    <>
      <div
        onClick={() => match.is_played && setShowScorecard(true)}
        className="rounded-xl p-4 transition-all card-hover"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${match.is_played ? statusColor : isToday ? 'var(--gold)' : 'var(--border)'}`,
          cursor: match.is_played ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle glow for completed */}
        {match.is_played && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(90deg, ${statusColor}08, transparent 40%)`,
          }} />
        )}

        <div className="relative flex items-center gap-4">
          {/* Match number */}
          <div className="font-display text-4xl w-12 text-center flex-shrink-0"
            style={{ color: match.is_played ? statusColor : 'var(--border2)', opacity: match.is_played ? 1 : 0.6 }}>
            {match.match_number}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1" style={{ color: 'var(--text)' }}>
              MVCC <span style={{ color: 'var(--text3)' }}>vs</span> {match.opponent}
            </div>
            <div className="flex gap-3 flex-wrap">
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                📅 {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                🕐 {match.time}
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                📍 {match.ground}
              </span>
            </div>

            {/* Score row */}
            {match.is_played && match.mvcc_score && (
              <div className="mt-2 font-mono text-sm flex items-center gap-2 flex-wrap"
                style={{ color: 'var(--text2)' }}>
                <span style={{ color: 'var(--mm)' }}>MVCC {match.mvcc_score}</span>
                <span style={{ color: 'var(--text3)' }}>·</span>
                <span style={{ color: 'var(--hb)' }}>
                  {match.opponent_short || match.opponent.split(' ')[0]} {match.opponent_score}
                </span>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Status badge */}
            <div className="font-mono text-xs tracking-widest px-3 py-1.5 rounded-full"
              style={{
                color: statusColor,
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}30`,
              }}>
              {statusLabel}
            </div>

            {/* Scorecard button for completed */}
            {match.is_played && (
              <div className="font-mono text-[9px] tracking-widest uppercase flex items-center gap-1"
                style={{ color: 'var(--text3)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 12H15M9 16H13"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                View Scorecard
              </div>
            )}
          </div>
        </div>
      </div>

      {showScorecard && (
        <ScorecardModal match={match} onClose={() => setShowScorecard(false)} />
      )}
    </>
  )
}
