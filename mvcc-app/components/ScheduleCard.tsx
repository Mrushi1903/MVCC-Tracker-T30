'use client'
import { useState } from 'react'
import { Match } from '@/lib/supabase'
import ShareCard from '@/components/ShareCard'

export default function ScheduleCard({ match }: { match: Match }) {
  const [showShare, setShowShare] = useState(false)

  // Parse date without timezone conversion by splitting the string
  const [year, month, day] = match.date.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const matchDate = new Date(year, month - 1, day)

  const isPast = matchDate < today
  const isToday = matchDate.getTime() === today.getTime()

  const statusColor = match.is_played
    ? match.result === 'won' ? 'var(--green)' : match.result === 'lost' ? 'var(--red)' : 'var(--text3)'
    : isToday ? 'var(--gold)' : 'var(--text3)'

  const statusLabel = match.is_played
    ? match.result === 'won' ? 'WON' : match.result === 'lost' ? 'LOST' : match.result === 'tied' ? 'TIED' : 'PLAYED'
    : isToday ? 'TODAY' : 'UPCOMING'

  return (
    <>
      <div
        className="rounded-xl p-4 transition-all card-hover"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${match.is_played ? statusColor : isToday ? 'var(--gold)' : 'var(--border)'}`,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Match number */}
          <div
            className="font-display text-4xl w-12 text-center flex-shrink-0"
            style={{ color: 'var(--border2)' }}
          >
            {match.match_number}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1" style={{ color: 'var(--text)' }}>
              MVCC <span style={{ color: 'var(--text3)' }}>vs</span> {match.opponent}
            </div>
            <div className="flex gap-4 flex-wrap">
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                📅{' '}
                {date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                🕐 {match.time}
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                📍 {match.ground}
              </span>
            </div>

            {/* Score if played */}
            {match.is_played && match.mvcc_score && (
              <div className="mt-2 font-mono text-sm" style={{ color: 'var(--text2)' }}>
                MVCC {match.mvcc_score} · {match.opponent.split(' ')[0]} {match.opponent_score}
              </div>
            )}
          </div>

          {/* Right side: status + share button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Status badge */}
            <div
              className="font-mono text-xs tracking-widest px-3 py-1.5 rounded-full"
              style={{
                color: statusColor,
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}30`,
              }}
            >
              {statusLabel}
            </div>

            {/* Share button — only for played matches */}
            {match.is_played && (
              <button
                onClick={() => setShowShare(true)}
                className="font-mono text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  color: 'var(--gold)',
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                📤 Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Card modal */}
      {showShare && match.is_played && match.result && (
        <ShareCard
          matchId={match.id}
          matchNumber={match.match_number}
          opponent={match.opponent}
          result={match.result as 'won' | 'lost' | 'tied' | 'no_result'}
          mvccScore={match.mvcc_score || ''}
          opponentScore={match.opponent_score || ''}
          date={match.date}
          ground={match.ground || ''}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  )
}
