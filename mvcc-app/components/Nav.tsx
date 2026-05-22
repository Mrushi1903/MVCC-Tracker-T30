'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Nav() {
  const path = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '/',         label: 'Standings' },
    { href: '/schedule', label: 'Schedule'  },
    { href: '/rules',    label: 'Rules'     },
  ]

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      transition: 'all 0.3s ease',
      background: scrolled ? 'rgba(5,8,15,0.92)' : 'rgba(5,8,15,0.6)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${scrolled ? 'var(--border2)' : 'var(--border)'}`,
      boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
    }}>
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #c9a84c 0%, #7a5c1e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
          }}>
            🏏
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl tracking-[3px]" style={{ color: 'var(--text)' }}>MVCC</span>
            <span className="font-display text-2xl tracking-[3px]" style={{
              background: 'linear-gradient(135deg, var(--mm), var(--mm-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>T30</span>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = path === href
            return (
              <Link key={href} href={href}
                className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  color:      active ? 'var(--text)'  : 'var(--text3)',
                  background: active ? 'var(--bg3)'   : 'transparent',
                  border:     active ? '1px solid var(--border2)' : '1px solid transparent',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', bottom: -1, left: '50%',
                    transform: 'translateX(-50%)',
                    width: '40%', height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--mm), transparent)',
                    borderRadius: 99,
                  }} />
                )}
                {label}
              </Link>
            )
          })}

          {path === '/admin' && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest ml-1"
              style={{ color: 'var(--mm)', border: '1px solid var(--mm-border)', background: 'var(--mm-dim)' }}>
              ADMIN
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}
