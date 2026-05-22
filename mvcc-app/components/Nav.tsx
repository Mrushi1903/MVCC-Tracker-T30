'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()

  return (
    <nav
      style={{
        background: 'rgba(11, 16, 32, 0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #00E5FF, #c9a84c, transparent)',
        opacity: 0.6,
      }} />

      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo + name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"
            style={{
              border: '1px solid rgba(201,168,76,0.4)',
              boxShadow: '0 0 12px rgba(201,168,76,0.15)',
            }}
          >
            <img src="/mavericks-logo.jpeg" alt="MVCC" className="w-full h-full object-cover" />
          </div>
          <div>
            <span
              className="font-display text-lg tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #f0d080)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              MAVERICKS
            </span>
            <span className="font-display text-lg tracking-wider ml-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              CC
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {[
            { href: '/', label: 'Standings' },
            { href: '/schedule', label: 'Schedule' },
            { href: '/rules', label: 'Rules' },
          ].map(({ href, label }) => {
            const isActive = path === href
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(0,229,255,0.2)' : 'transparent'}`,
                  boxShadow: isActive ? '0 0 12px rgba(0,229,255,0.1)' : 'none',
                }}
              >
                {label}
              </Link>
            )
          })}

          {path === '/admin' && (
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest"
              style={{
                color: 'var(--gold)',
                border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.08)',
                boxShadow: '0 0 12px rgba(245,158,11,0.1)',
              }}
            >
              ADMIN
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}
