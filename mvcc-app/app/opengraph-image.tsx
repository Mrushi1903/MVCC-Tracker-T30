// Default Open Graph image — auto-attached to every route via Next 15's
// metadata file convention. WhatsApp / iMessage / Twitter / Slack fetch this
// when a user pastes a link to the site, and render a rich preview card.
//
// This is intentionally TEXT-ONLY (no <img> tags, no DB calls, no custom
// fonts) so satori has the easiest possible render path. If this works, we
// can layer dynamic per-route OG images on top later (per-match cards etc.).
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'MVCC Internal Tournament 2026 — Mighty Mavericks vs Hell Boys'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0a1628 0%, #050d1a 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, color: '#F0B95B', letterSpacing: 6, fontWeight: 700 }}>
          MAVERICKS CRICKET CLUB
        </div>
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 900, color: 'white', letterSpacing: 8, marginTop: 20 }}>
          T30 · 2026
        </div>
        <div style={{ display: 'flex', fontSize: 36, color: '#94A3B8', letterSpacing: 2, marginTop: 24 }}>
          MIGHTY MAVERICKS  vs  HELL BOYS
        </div>
        <div style={{ display: 'flex', marginTop: 60, alignItems: 'center', gap: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 12, height: 12, borderRadius: 6, background: '#4ADE80',
          }} />
          <div style={{ display: 'flex', fontSize: 22, color: '#4ADE80', letterSpacing: 4, fontWeight: 700 }}>
            LIVE POINTS TRACKER
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      // OG images can be cached aggressively — they don't change unless we
      // redeploy.
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    },
  )
}
