import type { Metadata } from 'next'
import './globals.css'
import MobileNav from '@/components/MobileNav'

export const metadata: Metadata = {
  title: 'MVCC Internal Tournament 2026',
  description: 'Mighty Mavericks vs Hell Boys — T30 Internal Points Tracker',
  openGraph: {
    title: 'MVCC Internal Tournament 2026',
    description: 'MMs vs HBs — Live points tracker',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain grid-texture">
        {children}
        <MobileNav />
      </body>
    </html>
  )
}
