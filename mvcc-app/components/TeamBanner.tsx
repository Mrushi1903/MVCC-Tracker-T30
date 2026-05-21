'use client'

type Props = { mmTotal: number; hbTotal: number }

export default function TeamBanner({ mmTotal, hbTotal }: Props) {
  const total = mmTotal + hbTotal
  const mmPct = total > 0 ? (mmTotal / total) * 100 : 50
  const hbPct = 100 - mmPct
  const mmLeading = mmTotal >= hbTotal

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
    >
      <div className="grid grid-cols-3 gap-4 items-center mb-4">
        {/* MM */}
        <div className="text-left">
          <div
            className="font-display text-4xl md:text-5xl leading-none"
            style={{ color: 'var(--mm)' }}
          >
            {mmTotal}
          </div>
          <div
            className="font-mono text-xs tracking-[3px] uppercase mt-1"
            style={{ color: 'var(--text3)' }}
          >
            Total Pts
          </div>
          <div
            className="font-display text-lg tracking-wider mt-2"
            style={{ color: 'var(--mm)' }}
          >
            MIGHTY MAVERICKS
          </div>
          <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
            11 players
          </div>
        </div>

        {/* VS */}
        <div className="text-center">
          <div
            className="font-display text-5xl"
            style={{ color: mmLeading ? 'var(--mm)' : 'var(--hb)', opacity: 0.3 }}
          >
            VS
          </div>
          {total > 0 && (
            <div
              className="font-mono text-xs tracking-widest mt-1"
              style={{ color: 'var(--text3)' }}
            >
              {mmLeading ? '🔥 MMs lead' : '🔥 HBs lead'}
            </div>
          )}
        </div>

        {/* HB */}
        <div className="text-right">
          <div
            className="font-display text-4xl md:text-5xl leading-none"
            style={{ color: 'var(--hb)' }}
          >
            {hbTotal}
          </div>
          <div
            className="font-mono text-xs tracking-[3px] uppercase mt-1"
            style={{ color: 'var(--text3)' }}
          >
            Total Pts
          </div>
          <div
            className="font-display text-lg tracking-wider mt-2"
            style={{ color: 'var(--hb)' }}
          >
            HELL BOYS
          </div>
          <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
            11 players
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
        <div className="h-full flex">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${mmPct}%`, background: 'var(--mm)', borderRadius: '4px 0 0 4px' }}
          />
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${hbPct}%`, background: 'var(--hb)', borderRadius: '0 4px 4px 0' }}
          />
        </div>
      </div>

      <div className="flex justify-between mt-2">
        <span className="font-mono text-xs" style={{ color: 'var(--mm)' }}>
          {mmPct.toFixed(1)}%
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--hb)' }}>
          {hbPct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
