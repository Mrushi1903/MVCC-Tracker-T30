import type { Metadata, Viewport } from 'next'
import './globals.css'
import MobileNav from '@/components/MobileNav'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mvcc-tracker-t30.vercel.app'

export const viewport: Viewport = {
  themeColor: '#0B1020',
  width: 'device-width',
  initialScale: 1,
  // Allow user zoom — better for accessibility on stat tables.
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MVCC Internal Tournament 2026',
    template: '%s · MVCC T30 2026',
  },
  description: 'Mavericks Cricket Club — T30 internal tournament live tracker. Mighty Mavericks vs Hell Boys, 8 matches, live points.',
  applicationName: 'MVCC Tracker',
  keywords: ['cricket', 'MVCC', 'Mavericks Cricket Club', 'T30', 'tournament', 'Michigan'],
  // Tells iOS the site can be installed as a standalone app.
  appleWebApp: {
    capable: true,
    title: 'MVCC',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/mavericks-logo.jpeg',
    shortcut: '/mavericks-logo.jpeg',
    apple: '/mavericks-logo.jpeg',
  },
  openGraph: {
    title: 'MVCC Internal Tournament 2026',
    description: 'Mighty Mavericks vs Hell Boys — T30 live points tracker',
    type: 'website',
    siteName: 'MVCC Tracker',
    locale: 'en_US',
    url: SITE_URL,
    // /opengraph-image.tsx in app root is auto-picked up — we don't need to
    // list images here. Per-route opengraph-image.tsx files override per-route.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MVCC Internal Tournament 2026',
    description: 'Mighty Mavericks vs Hell Boys — T30 live points tracker',
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
