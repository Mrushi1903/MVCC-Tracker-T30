'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'

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
    <nav
      className="hidden md:block"
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(5,8,15,0.95)' : 'rgba(5,8,15,0.7)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: scrolled ? '1px solid var(--border2)' : '1px solid var(--border)',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid var(--mm-border)',
            boxShadow: '0 2px 12px rgba(201,168,76,0.25)',
            flexShrink: 0,
            transition: 'box-shadow 0.3s ease',
          }}
          className="group-hover:shadow-[0_4px_20px_rgba(201,168,76,0.45)]"
          >
            <Image
              src="/mavericks-logo.jpeg"
              alt="MVCC Logo"
              width={40}
              height={40}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-display text-xl tracking-[3px]"
              style={{
                background: 'linear-gradient(135deg, var(--mm), var(--mm-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              MAVERICKS
            </span>
            <span className="font-display text-xl tracking-[2px]" style={{ color: 'var(--text3)' }}>
              CC
            </span>
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
