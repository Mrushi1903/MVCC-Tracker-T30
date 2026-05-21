'use client'
import { Match } from '@/lib/supabase'

export default function ScheduleCard({ match }: { match: Match }) {
  const date = new Date(match.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const matchDate = new Date(match.date)
  matchDate.setHours(0, 0, 0, 0)

  const isPast = matchDate < today
  const isToday = matchDate.getTime() === today.getTime()
  const isNext = !match.is_played && !isPast

  const statusColor = match.is_played
    ? match.result === 'won' ? 'var(--green)' : match.result === 'lost' ? 'var(--red)' : 'var(--text3)'
    : isToday ? 'var(--gold)' : 'var(--text3)'

  const statusLabel = match.is_played
    ? match.result === 'won' ? 'WON' : match.result === 'lost' ? 'LOST' : match.result === 'tied' ? 'TIED' : 'PLAYED'
    : isToday ? 'TODAY' : 'UPCOMING'

  return (
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

        {/* Status badge */}
        <div
          className="font-mono text-xs tracking-widest px-3 py-1.5 rounded-full flex-shrink-0"
          style={{
            color: statusColor,
            background: `${statusColor}15`,
            border: `1px solid ${statusColor}30`,
          }}
        >
          {statusLabel}
        </div>
      </div>
    </div>
  )
}
