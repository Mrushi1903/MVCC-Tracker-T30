import Link from 'next/link'
import Nav from '@/components/Nav'

export default function PlayerNotFound() {
  return (
    <div style={{ background: '#0B1020', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-md mx-auto px-4 py-24 text-center">
        <div style={{ fontSize: 72, marginBottom: 12 }}>🏏</div>
        <h1 className="font-display tracking-widest mb-3" style={{ fontSize: 48, color: 'var(--text)' }}>
          PLAYER NOT FOUND
        </h1>
        <p className="font-mono text-xs tracking-widest mb-8" style={{ color: 'var(--text3)' }}>
          We couldn&apos;t find a Maverick by that name. Check the URL or head back to the standings.
        </p>
        <Link
          href="/t30"
          className="inline-flex items-center gap-2 font-mono text-xs tracking-[3px] uppercase px-4 py-2.5 rounded-lg"
          style={{
            color: 'var(--accent)',
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid var(--accent-border)',
            boxShadow: '0 0 14px rgba(0,229,255,0.15)',
          }}
        >
          ← Back to Standings
        </Link>
      </main>
    </div>
  )
}
