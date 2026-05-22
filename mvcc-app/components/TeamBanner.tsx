'use client'
import { useEffect, useRef, useState } from 'react'

type Props = { mmTotal: number; hbTotal: number }

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

export default function TeamBanner({ mmTotal, hbTotal }: Props) {
  const total     = mmTotal + hbTotal
  const mmPct     = total > 0 ? (mmTotal / total) * 100 : 50
  const hbPct     = 100 - mmPct
  const mmLeading = mmTotal >= hbTotal
  const diff      = Math.abs(mmTotal - hbTotal)

  const mmCount = useCountUp(mmTotal)
  const hbCount = useCountUp(hbTotal)

  const [barVisible, setBarVisible] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setBarVisible(true); observer.disconnect() }
    }, { threshold: 0.3 })
    if (barRef.current) observer.observe(barRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="mb-10 fade-in-1">
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          boxShadow: '0 8px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Top gradient line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--mm) 0%, #c9a84c80 48%, transparent 50%, #3b82f680 52%, var(--hb) 100%)',
        }} />

        {/* Background glow blobs */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `
            radial-gradient(ellipse 40% 60% at 10% 50%, #c9a84c08 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 90% 50%, #3b82f608 0%, transparent 70%)
          `,
          pointerEvents: 'none',
        }} />

        <div className="relative p-6 md:p-8">
          <div className="grid grid-cols-3 gap-4 items-center">

            {/* MM SIDE */}
            <div className="text-left">
              <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center gap-2"
                style={{ color: 'var(--mm)', opacity: 0.8 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--mm)', boxShadow: '0 0 8px var(--mm)',
                }} />
                Mighty Mavericks
              </div>
              <div
                className="font-display leading-none"
                style={{ fontSize: 80, color: 'var(--mm)',
                  textShadow: '0 0 40px rgba(201,168,76,0.3)',
                  letterSpacing: -2,
                }}
              >
                {mmCount}
              </div>
              <div className="font-mono text-xs tracking-widest mt-2" style={{ color: 'var(--text3)' }}>
                TOTAL POINTS
              </div>
              {mmLeading && total > 0 && (
                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full font-mono text-xs"
                  style={{
                    background: 'linear-gradient(135deg, var(--mm-dim), transparent)',
                    border: '1px solid var(--mm-border)',
                    color: 'var(--mm)',
                  }}>
                  <span className="live-dot" style={{ width: 5, height: 5 }} />
                  LEADING +{diff} PTS
                </div>
              )}
            </div>

            {/* CENTER */}
            <div className="text-center">
              <div className="font-display text-7xl tracking-widest"
                style={{ color: 'var(--border2)', letterSpacing: 8 }}>
                VS
              </div>
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)', margin: '12px 0' }} />
              <div className="font-mono text-[10px] tracking-[3px] uppercase" style={{ color: 'var(--text3)' }}>
                Season 2026
              </div>
              <div className="font-mono text-[10px] tracking-[3px] uppercase mt-0.5" style={{ color: 'var(--text3)' }}>
                T30 Internal
              </div>
            </div>

            {/* HB SIDE */}
            <div className="text-right">
              <div className="font-mono text-xs tracking-[3px] uppercase mb-3 flex items-center justify-end gap-2"
                style={{ color: 'var(--hb)', opacity: 0.8 }}>
                Hell Boys
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--hb)', boxShadow: '0 0 8px var(--hb)',
                }} />
              </div>
              <div
                className="font-display leading-none"
                style={{ fontSize: 80, color: 'var(--hb)',
                  textShadow: '0 0 40px rgba(59,130,246,0.3)',
                  letterSpacing: -2,
                }}
              >
                {hbCount}
              </div>
              <div className="font-mono text-xs tracking-widest mt-2" style={{ color: 'var(--text3)' }}>
                TOTAL POINTS
              </div>
              {!mmLeading && total > 0 && (
                <div className="inline-flex items-center justify-end gap-2 mt-3 px-3 py-1.5 rounded-full font-mono text-xs"
                  style={{
                    background: 'linear-gradient(135deg, var(--hb-dim), transparent)',
                    border: '1px solid var(--hb-border)',
                    color: 'var(--hb)',
                  }}>
                  <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--hb)', boxShadow: '0 0 6px var(--hb)' }} />
                  LEADING +{diff} PTS
                </div>
              )}
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="mt-8" ref={barRef}>
            <div className="h-3 rounded-full overflow-hidden relative"
              style={{ background: 'var(--bg4)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
              <div className="h-full flex absolute inset-0">
                <div style={{
                  width: barVisible ? `${mmPct}%` : '0%',
                  background: 'linear-gradient(90deg, #7a5c1e, var(--mm), var(--mm-light))',
                  borderRadius: '99px 0 0 99px',
                  transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1) 0.2s',
                  boxShadow: '4px 0 12px rgba(201,168,76,0.4)',
                }} />
                <div style={{
                  width: barVisible ? `${hbPct}%` : '0%',
                  background: 'linear-gradient(90deg, var(--hb), var(--hb-light))',
                  borderRadius: '0 99px 99px 0',
                  transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1) 0.2s',
                  boxShadow: '-4px 0 12px rgba(59,130,246,0.4)',
                }} />
              </div>
            </div>
            <div className="flex justify-between mt-2.5">
              <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mm)' }}>
                {mmPct.toFixed(1)}%
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                8 matches · 1 played
              </span>
              <span className="font-mono text-xs font-semibold" style={{ color: 'var(--hb)' }}>
                {hbPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
