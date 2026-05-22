'use client'

type Props = { mmTotal: number; hbTotal: number }

export default function TeamBanner({ mmTotal, hbTotal }: Props) {
  const total    = mmTotal + hbTotal
  const mmPct    = total > 0 ? (mmTotal / total) * 100 : 50
  const hbPct    = 100 - mmPct
  const mmLeading = mmTotal >= hbTotal
  const diff      = Math.abs(mmTotal - hbTotal)

  return (
    <div className="mb-8 fade-in-1">
      {/* Main battle card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top accent line */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--mm), var(--bg3) 50%, var(--hb))' }} />

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 items-center">

            {/* MM SIDE */}
            <div className="text-left">
              <div
                className="font-mono text-xs tracking-[3px] uppercase mb-2"
                style={{ color: 'var(--mm)', opacity: 0.7 }}
              >
                Mighty Mavericks
              </div>
              <div
                className="font-display leading-none mb-1"
                style={{ fontSize: 64, color: 'var(--mm)' }}
              >
                {mmTotal}
              </div>
              <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                TOTAL PTS · 11 PLAYERS
              </div>
              {mmLeading && total > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full font-mono text-xs"
                  style={{ background: 'var(--mm-dim)', border: '1px solid var(--mm-border)', color: 'var(--mm)' }}
                >
                  <span className="live-dot" style={{ width: 5, height: 5 }} />
                  LEADING +{diff}
                </div>
              )}
            </div>

            {/* VS CENTER */}
            <div className="text-center">
              <div
                className="font-display text-6xl"
                style={{ color: 'var(--border2)', letterSpacing: 4 }}
              >
                VS
              </div>
              <div className="divider my-3" />
              <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                SEASON 2026
              </div>
              <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                T30 INTERNAL
              </div>
            </div>

            {/* HB SIDE */}
            <div className="text-right">
              <div
                className="font-mono text-xs tracking-[3px] uppercase mb-2"
                style={{ color: 'var(--hb)', opacity: 0.7 }}
              >
                Hell Boys
              </div>
              <div
                className="font-display leading-none mb-1"
                style={{ fontSize: 64, color: 'var(--hb)' }}
              >
                {hbTotal}
              </div>
              <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                TOTAL PTS · 11 PLAYERS
              </div>
              {!mmLeading && total > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full font-mono text-xs"
                  style={{ background: 'var(--hb-dim)', border: '1px solid var(--hb-border)', color: 'var(--hb)' }}
                >
                  <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--hb)' }} />
                  LEADING +{diff}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg4)' }}
            >
              <div className="h-full flex">
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${mmPct}%`,
                    background: 'linear-gradient(90deg, #a07830, var(--mm))',
                    borderRadius: '99px 0 0 99px',
                  }}
                />
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${hbPct}%`,
                    background: 'linear-gradient(90deg, var(--hb), #1d4ed8)',
                    borderRadius: '0 99px 99px 0',
                  }}
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
        </div>
      </div>
    </div>
  )
}
