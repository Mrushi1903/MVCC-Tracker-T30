'use client'

import Nav from '@/components/Nav'

const BATTING_RULES = [
  { action: 'Each Run Scored',    pts: '+1',   note: 'Every run counts' },
  { action: '30+ Runs (Bonus)',   pts: '+10',  note: 'Milestone bonus' },
  { action: '50+ Runs (Bonus)',   pts: '+20',  note: 'Milestone bonus' },
  { action: '100+ Runs (Bonus)',  pts: '+40',  note: 'Milestone bonus' },
  { action: 'Strike Rate Bonus',  pts: '+5·SR/135',  note: '25+ runs AND SR ≥ 135 (rounded)' },
]

const BOWLING_RULES = [
  { action: 'Each Wicket Taken',           pts: '+20',         note: 'Min. 1 complete over required' },
  { action: 'Economy < 4.0',               pts: '+10',         note: 'Min. 1 over + at least 1 wicket' },
  { action: 'Tight Spell (0 Wickets)',     pts: '+(6−Econ)·5', note: '0 wickets + ≥ 2 overs + econ < 6 (rounded)' },
  { action: '3-Wicket Haul',               pts: '+20',         note: 'Min. 1 complete over' },
  { action: '5-Wicket Haul',               pts: '+40',         note: 'Replaces 3-wkt bonus' },
]

const FIELDING_RULES = [
  { action: 'Catch',              pts: '+10',  note: 'Clean catch' },
  { action: 'Run Out (Primary)',  pts: '+10',  note: 'Direct hit or primary fielder' },
  { action: 'Run Out (Helper)',   pts: '+5',   note: 'Assisting fielder' },
  { action: 'Stumping',          pts: '+10',  note: 'Wicket-keeper only' },
]

const BONUS_RULES = [
  { action: 'Player of the Match', pts: '+30', note: 'Manually awarded by admin' },
  { action: 'Season MVP',          pts: '+50', note: 'End of season award' },
  { action: 'Available but Benched', pts: '+10', note: 'Marked available, not picked in Playing 12' },
]

function RuleTable({
  title, emoji, color, rules,
}: {
  title: string
  emoji: string
  color: string
  rules: { action: string; pts: string; note: string }[]
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{
          background: 'var(--bg3)',
          borderBottom: '1px solid var(--border)',
          borderLeft: `3px solid ${color}`,
        }}
      >
        <span style={{ fontSize: 22 }}>{emoji}</span>
        <span className="font-display text-2xl tracking-wider" style={{ color }}>
          {title}
        </span>
      </div>

      {/* Rows */}
      <div>
        {rules.map((rule, i) => (
          <div
            key={rule.action}
            className="flex items-center justify-between px-5 py-4"
            style={{
              borderBottom: i < rules.length - 1 ? '1px solid var(--border)' : 'none',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
            }}
          >
            <div>
              <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                {rule.action}
              </div>
              <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                {rule.note}
              </div>
            </div>
            <div
              className="font-display text-2xl ml-4 flex-shrink-0"
              style={{ color }}
            >
              {rule.pts}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RulesPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-10 fade-in">
          <p className="font-mono text-xs tracking-[4px] uppercase mb-3 flex items-center gap-2"
            style={{ color: 'var(--text3)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mm)', display: 'inline-block' }} />
            MVCC T30 · Season 2026
          </p>
          <h1 className="font-display tracking-widest mb-2"
            style={{ fontSize: 64, color: 'var(--text)', lineHeight: 1 }}>
            POINTS RULES
          </h1>
          <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, var(--mm), transparent)', borderRadius: 99, marginTop: 12 }} />
          <p className="font-mono text-sm mt-4" style={{ color: 'var(--text3)' }}>
            Points are calculated automatically after each match scorecard is entered.
            All batting milestones are tiered — only the highest applies.
          </p>
        </div>

        {/* Quick summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 fade-in-1">
          {[
            { label: 'Run',     value: '1 pt',  color: 'var(--mm)' },
            { label: 'Wicket',  value: '20 pts', color: 'var(--hb)' },
            { label: 'Catch',   value: '10 pts', color: 'var(--gold)' },
            { label: 'POTM',    value: '30 pts', color: 'var(--green)' },
          ].map(s => (
            <div key={s.label}
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <div className="font-display text-3xl" style={{ color: s.color }}>{s.value}</div>
              <div className="font-mono text-xs mt-1 tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Rule tables */}
        <div className="fade-in-2">
          <RuleTable title="BATTING" emoji="🏏" color="var(--mm)"   rules={BATTING_RULES}  />
          <RuleTable title="BOWLING" emoji="⚡" color="var(--hb)"   rules={BOWLING_RULES}  />
          <RuleTable title="FIELDING" emoji="🧤" color="var(--gold)" rules={FIELDING_RULES} />
          <RuleTable title="AWARDS"   emoji="🏅" color="var(--green)" rules={BONUS_RULES}   />
        </div>

        {/* Important notes */}
        <div
          className="rounded-2xl p-5 mb-6 fade-in-3"
          style={{ background: 'var(--bg2)', border: '1px solid var(--mm-border)' }}
        >
          <div className="font-display text-xl tracking-wider mb-4" style={{ color: 'var(--mm)' }}>
            ⚠️ IMPORTANT NOTES
          </div>
          <div className="flex flex-col gap-3">
            {[
              'Bowler must complete a minimum of 1 full over for bowling points to count.',
              'Batting milestones are tiered — if you score 50+ runs, you only get the +20 bonus (not +10 as well).',
              'Strike-rate bonus is added on top of milestone bonus when you cross both thresholds (25+ runs and SR ≥ 135).',
              'Economy bonus requires minimum 1 complete over AND at least 1 wicket taken.',
              'Tight-spell bonus (0 wickets) requires minimum 2 overs and economy under 6.',
              '5-wicket haul replaces the 3-wicket bonus — they do not stack.',
              'Availability bonus (+10) applies only if you submitted "Available" before the match and the captain did not pick you in the Playing 12.',
              'External players (marked EXT) have their stats tracked but their points do not count toward team totals.',
              'POTM is manually assigned by the admin after each match — never auto-assigned.',
              'MVP award is given at end of season by team vote.',
              'Points update live as soon as the admin saves the scorecard.',
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-3">
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--mm)', flexShrink: 0, marginTop: 6,
                }} />
                <p className="text-sm" style={{ color: 'var(--text2)' }}>{note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="fade-in-4">
          <div className="font-mono text-xs tracking-[4px] uppercase mb-4" style={{ color: 'var(--text3)' }}>
            FAQ
          </div>
          {[
            {
              q: 'What if I bowled but didn\'t take any wickets?',
              a: 'You get 0 bowling points. Wickets are required for bowling points, and you must bowl at least 1 complete over.',
            },
            {
              q: 'Do batting milestones stack?',
              a: 'No. Only the highest milestone applies. If you score 55 runs, you get +20 bonus (50+ tier), not +30 (+10 + +20).',
            },
            {
              q: 'How is Player of the Match decided?',
              a: 'POTM is manually assigned by the admin based on the official CricClub result. It is never auto-assigned by the system.',
            },
            {
              q: 'When do points update?',
              a: 'Points update instantly as soon as the admin saves the scorecard in the admin panel. The leaderboard is live.',
            },
            {
              q: 'What counts as a run out for the helper?',
              a: 'The helper is the second fielder involved in a run out — e.g., the one who relays the ball. They get +5 pts vs the primary fielder\'s +10.',
            },
          ].map((faq, i) => (
            <div key={i}
              className="rounded-xl p-4 mb-3"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <div className="font-semibold text-sm mb-1.5 flex items-start gap-2"
                style={{ color: 'var(--text)' }}>
                <span style={{ color: 'var(--mm)', flexShrink: 0 }}>Q.</span>
                {faq.q}
              </div>
              <div className="text-sm flex items-start gap-2"
                style={{ color: 'var(--text2)' }}>
                <span style={{ color: 'var(--hb)', flexShrink: 0 }}>A.</span>
                {faq.a}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)', marginBottom: 16 }} />
          <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
            MVCC T30 2026 · Michigan · #MaverickSpirit
          </p>
        </div>

      </main>
    </div>
  )
}
