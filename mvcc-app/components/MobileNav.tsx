'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = [
  'mrushireddy2232@gmail.com',  // Rushi
  'viswakasu@gmail.com',         // Viswa — Captain
  'rohitmaddipati23@gmail.com',  // Rohith — VC
]

export default function MobileNav() {
  const path = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if current user is an admin
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
        setIsAdmin(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const tabs = [
    {
      href: '/',
      label: 'Standings',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9 21 9 15 12 15C15 15 15 21 15 21M9 21H15"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: '/schedule',
      label: 'Schedule',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="3"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8" strokeLinecap="round"
          />
          <path d="M16 2V6M8 2V6M3 10H21"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8" strokeLinecap="round"
          />
          <path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01M16 18H16.01"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="2" strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: '/availability',
      label: 'Avail',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 12l2 2 4-4M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: '/rules',
      label: 'Rules',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 5.55228 9.44772 6 10 6H14C14.5523 6 15 5.55228 15 5M9 5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5M9 12H15M9 16H13"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ]

  // Add admin tab if logged in
  if (isAdmin) {
    tabs.push({
      href: '/admin',
      label: 'Admin',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8" strokeLinecap="round"
          />
          <path
            d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74486 20.1656 6.23577 20.3766 5.705 20.3766C5.17423 20.3766 4.66514 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95231 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87231 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83455 6.74486 3.62353 6.23577 3.62353 5.705C3.62353 5.17423 3.83455 4.66514 4.21 4.29C4.58514 3.91445 5.09423 3.70343 5.625 3.70343C6.15577 3.70343 6.66486 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95231 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87231 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83455 17.7642 3.62353 18.295 3.62353C18.8258 3.62353 19.3349 3.83455 19.71 4.21C20.0856 4.58514 20.2966 5.09423 20.2966 5.625C20.2966 6.15577 20.0856 6.66486 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z"
            stroke={active ? 'var(--mm)' : 'var(--text3)'}
            strokeWidth="1.8" strokeLinecap="round"
          />
        </svg>
      ),
    })
  }

  return (
    <>
      {/* Spacer so content doesn't hide behind the nav */}
      <div className="h-20 md:hidden" />

      {/* Mobile Bottom Nav */}
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
        {/* Gold top line */}
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
                {/* Active indicator dot */}
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

                {/* Icon with glow on active */}
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

                {/* Label */}
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
