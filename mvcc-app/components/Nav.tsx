'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(7, 13, 24, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--mm), #a07830)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            🏏
          </div>
          <div>
            <span className="font-display text-xl tracking-widest" style={{ color: 'var(--text)' }}>
              MVCC
            </span>
            <span className="font-display text-xl tracking-widest ml-1.5" style={{ color: 'var(--mm)' }}>
              T30
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {[
            { href: '/',         label: 'Standings' },
            { href: '/schedule', label: 'Schedule'  },
          ].map(({ href, label }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  color:      active ? 'var(--text)'  : 'var(--text3)',
                  background: active ? 'var(--bg3)'   : 'transparent',
                  border:     active ? '1px solid var(--border2)' : '1px solid transparent',
                }}
              >
                {label}
              </Link>
            )
          })}

          {path === '/admin' && (
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest ml-1"
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
