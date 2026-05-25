// Global loading skeleton — fires instantly on first navigation to any route
// while the page component fetches its data. Keeps the dark theme consistent
// so there's no flash of white default.
export default function Loading() {
  return (
    <div
      style={{
        background: '#0B1020',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.25)',
        fontFamily: "'Bebas Neue', cursive",
        letterSpacing: '6px',
        fontSize: 28,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.08)',
            borderTopColor: 'var(--mm)',
            animation: 'rotateSlow 0.9s linear infinite',
          }}
        />
        LOADING
      </div>
    </div>
  )
}
