'use client'

import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion'
import { useEffect, useState } from 'react'

type Props = { mmTotal: number; hbTotal: number }

function AnimatedNumber({ value, color, glow }: { value: number; color: string; glow: string }) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 80, damping: 18, mass: 0.8 })
  const rounded = useTransform(spring, latest => Math.round(latest).toString())

  useEffect(() => { mv.set(value) }, [value, mv])

  return (
    <motion.span
      className="font-display leading-none mb-1 block"
      style={{
        fontSize: 'clamp(40px, 8vw, 64px)',
        color,
        textShadow: glow,
        transition: 'color 0.5s ease, text-shadow 0.5s ease',
      }}
    >
      <motion.span>{rounded}</motion.span>
    </motion.span>
  )
}

export default function TeamBanner({ mmTotal, hbTotal }: Props) {
  const total = mmTotal + hbTotal
  const mmPct = total > 0 ? (mmTotal / total) * 100 : 50
  const hbPct = 100 - mmPct
  const mmLeading = mmTotal > hbTotal
  const hbLeading = hbTotal > mmTotal
  const tied = mmTotal === hbTotal

  const mmColor = mmLeading ? '#F59E0B' : tied ? 'var(--mm)' : '#64748b'
  const hbColor = hbLeading ? '#F59E0B' : tied ? 'var(--hb)' : '#64748b'
  const mmTextGlow = mmLeading ? '0 0 30px rgba(245,158,11,0.4)' : 'none'
  const hbTextGlow = hbLeading ? '0 0 30px rgba(245,158,11,0.4)' : 'none'

  const leadDiff = Math.abs(mmTotal - hbTotal)

  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.9 }}
      className="rounded-2xl p-5 mb-6 relative overflow-hidden z-content"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: mmLeading
          ? 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(245,158,11,0.06) 0%, transparent 70%)'
          : hbLeading
          ? 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(245,158,11,0.06) 0%, transparent 70%)'
          : 'none',
      }} />

      <div className="relative z-content">
        <div className="grid grid-cols-3 gap-2 items-center mb-4">

          {/* ── MM ── */}
          <div className="text-left">
            <div className="font-mono text-[10px] tracking-[3px] uppercase mb-1 flex items-center gap-1.5"
              style={{ color: mmLeading ? '#F59E0B' : 'var(--text3)' }}>
              <motion.span
                animate={mmLeading ? { boxShadow: ['0 0 6px rgba(245,158,11,0.6)', '0 0 14px rgba(245,158,11,0.95)', '0 0 6px rgba(245,158,11,0.6)'] } : {}}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: mmLeading ? '#F59E0B' : '#64748b',
                  display: 'inline-block',
                }}
              />
              MM
              {mmLeading && <span style={{ fontSize: 9 }}>LEADING</span>}
            </div>

            <AnimatedNumber value={mmTotal} color={mmColor} glow={mmTextGlow} />

            <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--text3)' }}>
              TOTAL PTS
            </div>

            <div className="font-display text-base tracking-wider" style={{ color: mmColor, opacity: 0.9 }}>
              MIGHTY MAVERICKS
            </div>
            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
              11 players
            </div>
          </div>

          {/* ── VS ── */}
          <div className="text-center">
            <div className="font-display text-4xl mb-1" style={{ color: 'rgba(255,255,255,0.08)' }}>
              VS
            </div>

            {total > 0 && !tied && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 14 }}
                className="font-mono text-[10px] tracking-widest px-2 py-1 rounded-full mx-auto w-fit"
                style={{
                  color: '#F59E0B',
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                +{leadDiff} PTS
              </motion.div>
            )}

            {tied && total > 0 && (
              <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text3)' }}>
                TIED
              </div>
            )}
          </div>

          {/* ── HB ── */}
          <div className="text-right">
            <div className="font-mono text-[10px] tracking-[3px] uppercase mb-1 flex items-center justify-end gap-1.5"
              style={{ color: hbLeading ? '#F59E0B' : 'var(--text3)' }}>
              {hbLeading && <span style={{ fontSize: 9 }}>LEADING</span>}
              HB
              <motion.span
                animate={hbLeading ? { boxShadow: ['0 0 6px rgba(245,158,11,0.6)', '0 0 14px rgba(245,158,11,0.95)', '0 0 6px rgba(245,158,11,0.6)'] } : {}}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: hbLeading ? '#F59E0B' : '#64748b',
                  display: 'inline-block',
                }}
              />
            </div>

            <AnimatedNumber value={hbTotal} color={hbColor} glow={hbTextGlow} />

            <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--text3)' }}>
              TOTAL PTS
            </div>

            <div className="font-display text-base tracking-wider" style={{ color: hbColor, opacity: 0.9 }}>
              HELL BOYS
            </div>
            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
              11 players
            </div>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mmPct}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.2 }}
              className="h-full"
              style={{
                background: mmLeading
                  ? 'linear-gradient(90deg, #c9a84c, #F59E0B)'
                  : 'linear-gradient(90deg, #64748b, #475569)',
                borderRadius: '4px 0 0 4px',
              }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${hbPct}%` }}
              transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.2 }}
              className="h-full"
              style={{
                background: hbLeading
                  ? 'linear-gradient(90deg, #F59E0B, #c9a84c)'
                  : 'linear-gradient(90deg, #475569, #64748b)',
                borderRadius: '0 4px 4px 0',
              }}
            />
          </div>
        </div>

        <div className="flex justify-between mt-2">
          <span className="font-mono text-[11px]" style={{ color: mmLeading ? '#F59E0B' : 'var(--text3)' }}>
            {mmPct.toFixed(1)}%
          </span>
          <span className="font-mono text-[11px]" style={{ color: hbLeading ? '#F59E0B' : 'var(--text3)' }}>
            {hbPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}
