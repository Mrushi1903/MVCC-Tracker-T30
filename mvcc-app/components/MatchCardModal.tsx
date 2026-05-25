'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type Props = {
  matchId: number
  matchNumber: number
  opponent: string
  onClose: () => void
}

function safeFilenamePart(s: string): string {
  return s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function MatchCardModal({ matchId, matchNumber, opponent, onClose }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Cache-bust per session so re-saves of the same match show the latest.
  const [src] = useState(`/api/match-card/${matchId}?ts=${Date.now()}`)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(src)
      if (!res.ok) throw new Error('failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MVCC-Match${matchNumber}-vs-${safeFilenamePart(opponent)}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // user can right-click → save image as fallback
    } finally {
      setDownloading(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 250,
        background: 'rgba(5,8,15,0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-[540px] rounded-2xl overflow-hidden relative"
        style={{
          background: 'rgba(15,21,40,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="font-mono text-[10px] tracking-[3px] uppercase" style={{ color: 'var(--text3)' }}>
              Instagram Share Card
            </div>
            <div className="font-display text-xl tracking-wider mt-0.5" style={{ color: 'var(--text)' }}>
              Match {matchNumber} · vs {opponent}
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border2)', color: 'var(--text3)', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="relative aspect-square rounded-xl overflow-hidden"
            style={{ background: 'rgba(10,22,40,1)', border: '1px solid var(--border)' }}>
            {!loaded && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '2px solid var(--border2)', borderTop: '2px solid var(--mm)',
                    marginBottom: 10,
                  }}
                />
                <div className="font-mono text-[11px] tracking-widest" style={{ color: 'var(--text3)' }}>
                  GENERATING CARD…
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-6">
                <div>
                  <div className="font-display text-xl tracking-wider mb-2" style={{ color: 'var(--red)' }}>
                    GENERATION FAILED
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                    Try again in a moment, or check the API route.
                  </div>
                </div>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Match ${matchNumber} card`}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 240ms ease-out',
              }}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={handleDownload}
              disabled={!loaded || downloading}
              className="flex-1 py-3 rounded-xl font-display text-lg tracking-wider"
              style={{
                background: loaded
                  ? 'linear-gradient(90deg, #c9a84c 0%, #f0d080 50%, #c9a84c 100%)'
                  : 'rgba(255,255,255,0.06)',
                backgroundSize: '200% auto',
                color: loaded ? '#0B1020' : 'var(--text3)',
                cursor: loaded ? 'pointer' : 'not-allowed',
                animation: loaded ? 'shimmer 3.5s linear infinite' : undefined,
                boxShadow: loaded ? '0 6px 22px rgba(201,168,76,0.3)' : 'none',
              }}
            >
              {downloading ? 'DOWNLOADING…' : '⬇ Download PNG'}
            </motion.button>
            <button
              onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${src.split('?')[0]}`)}
              className="px-4 py-3 rounded-xl font-mono text-xs tracking-widest uppercase"
              style={{
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                cursor: 'pointer',
              }}
              title="Copy direct image URL"
            >
              ⧉ URL
            </button>
          </div>

          <p className="font-mono text-[10px] mt-3 text-center" style={{ color: 'var(--text3)' }}>
            1080 × 1080 · perfect for Instagram, WhatsApp, X
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
