'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = [
  'mrushireddy2232@gmail.com',  // Rushi
  'viswakasu@gmail.com',         // Viswa — Captain
  'rohitmaddipati@gmail.com',    // Rohith — VC
]

type SegMeta = { short: string; label: string; color: string }

const TOURNAMENT_SEGMENTS: SegMeta[] = [
  { short: 't30', label: 'T30 2026', color: 'var(--mm)' },
  { short: 't20', label: 'T20 2026', color: 'var(--hb)' },
]

export default function MobileNav() {
  const path = usePathname() || '/'
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) setIsAdmin(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) setIsAdmin(true)
      else setIsAdmin(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const seg = TOURNAMENT_SEGMENTS.find(s => path === `/${s.short}` || path.startsWith(`/${s.short}/`))

  // Home: render nothing — there's no per-tournament nav to show.
  if (!seg) return null

  const tabs: { href: string; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      href: `/${seg.short}`,
      label: 'Standings',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9 21 9 15 12 15C15 15 15 21 15 21M9 21H15"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: `/${seg.short}/schedule`,
      label: 'Schedule',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="3" stroke={active ? 'var(--mm)' : 'var(--text3)'} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 2V6M8 2V6M3 10H21" stroke={active ? 'var(--mm)' : 'var(--text3)'} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01M16 18H16.01"
            stroke={active ? 'var(--mm)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: `/${seg.short}/availability`,
      label: 'Avail',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"
            stroke={active ? 'var(--mm)' : 'var(--text3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: `/${seg.short}/rules`,
      label: 'Rules',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 12H15M9 16H13"
            stroke={active ? 'var(--mm)' : 'var(--text3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  if (isAdmin) {
    tabs.push({
      href: `/${seg.short}/admin`,
      label: 'Admin',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
            stroke={active ? 'var(--mm)' : 'var(--text3)'} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 0 1 10.08 21V20.91A1.65 1.65 0 0 0 9 19.4A1.65 1.65 0 0 0 7.18 19.73L7.12 19.79A2 2 0 1 1 4.29 16.96L4.35 16.9A1.65 1.65 0 0 0 4.68 15.08A1.65 1.65 0 0 0 3.17 14.08H3A2 2 0 0 1 3 10.08H3.09A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.27 7.18L4.21 7.12A2 2 0 1 1 7.04 4.29L7.1 4.35A1.65 1.65 0 0 0 8.92 4.68H9A1.65 1.65 0 0 0 10 3.17V3A2 2 0 0 1 14 3V3.09A1.65 1.65 0 0 0 15 4.6A1.65 1.65 0 0 0 16.82 4.27L16.88 4.21A2 2 0 1 1 19.71 7.04L19.65 7.1A1.65 1.65 0 0 0 19.32 8.92V9A1.65 1.65 0 0 0 20.83 10H21A2 2 0 0 1 21 14H20.91A1.65 1.65 0 0 0 19.4 15Z"
            stroke={active ? 'var(--mm)' : 'var(--text3)'} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    })
  }

  return (
    <>
      <div className="h-24 md:hidden" />

      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(5, 8, 15, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border2)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Breadcrumb chip */}
        <div className="px-4 pt-1.5 pb-0.5 flex items-center justify-between">
          <span
            className="font-mono text-[10px] tracking-[2px] uppercase px-2 py-0.5 rounded-full"
            style={{
              color: seg.color,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border2)',
            }}
          >
            {seg.label}
          </span>
        </div>

        {/* Gradient line */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, var(--mm) 30%, var(--hb) 70%, transparent 100%)',
          opacity: 0.6,
        }} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
            padding: '8px 0',
          }}
        >
          {tabs.map(tab => {
            const active = path === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '6px 4px',
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 20,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--mm), transparent)',
                    borderRadius: 99,
                  }} />
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 36,
                  borderRadius: 12,
                  background: active ? 'var(--mm-dim)' : 'transparent',
                  border: active ? '1px solid var(--mm-border)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  filter: active ? 'drop-shadow(0 0 6px rgba(201,168,76,0.4))' : 'none',
                }}>
                  {tab.icon(active)}
                </div>

                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--mm)' : 'var(--text3)',
                    transition: 'color 0.2s ease',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
