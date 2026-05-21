'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()

  return (
    <nav
      style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🏏</span>
          <span className="font-display text-lg tracking-wider" style={{ color: 'var(--text)' }}>
            MVCC <span style={{ color: 'var(--text3)' }}>T30</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              color: path === '/' ? 'var(--text)' : 'var(--text3)',
              background: path === '/' ? 'var(--bg3)' : 'transparent',
            }}
          >
            Standings
          </Link>

          <Link
            href="/schedule"
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              color: path === '/schedule' ? 'var(--text)' : 'var(--text3)',
              background: path === '/schedule' ? 'var(--bg3)' : 'transparent',
            }}
          >
            Schedule
          </Link>

          {/* Admin badge — only visible when on admin page */}
          {path === '/admin' && (
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest"
              style={{ color: 'var(--mm)', border: '1px solid var(--mm-border)', background: 'var(--mm-dim)' }}
            >
              ADMIN
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}
