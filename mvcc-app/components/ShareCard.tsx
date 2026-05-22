'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────
type TopPerformer = {
  short_name: string
  value: number
  label: string
  sub?: string
}

type ShareCardProps = {
  matchId: number
  matchNumber: number
  opponent: string
  result: 'won' | 'lost' | 'tied' | 'no_result'
  mvccScore: string
  opponentScore: string
  date: string
  ground: string
  onClose: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ShareCard({
  matchId,
  matchNumber,
  opponent,
  result,
  mvccScore,
  opponentScore,
  date,
  ground,
  onClose,
}: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [performers, setPerformers] = useState<TopPerformer[]>([])
  const [potmName, setPotmName] = useState<string>('')

  // Fetch top performers from Supabase
  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: perfs } = await supabase
        .from('performances')
        .select('*, player:players(short_name)')
        .eq('match_id', matchId)
        .order('total_points', { ascending: false })

      if (!perfs || perfs.length === 0) {
        setLoading(false)
        return
      }

      // Top batter (most runs)
      const batters = [...perfs].sort((a, b) => b.runs - a.runs)
      const topBatter = batters[0]

      // Top bowler (most wickets, tiebreak: fewer runs)
      const bowlers = perfs.filter(p => p.wickets > 0).sort((a, b) =>
        b.wickets !== a.wickets ? b.wickets - a.wickets : a.runs_conceded - b.runs_conceded
      )
      const topBowler = bowlers[0]

      // POTM
      const potm = perfs.find(p => p.is_potm)

      const list: TopPerformer[] = []

      if (potm) {
        setPotmName((potm.player as any)?.short_name || '')
      }

      if (topBatter && topBatter.runs > 0) {
        list.push({
          short_name: (topBatter.player as any)?.short_name || '',
          value: topBatter.runs,
          label: 'Top Scorer',
          sub: `${topBatter.balls_faced} balls`,
        })
      }

      if (topBowler) {
        list.push({
          short_name: (topBowler.player as any)?.short_name || '',
          value: topBowler.wickets,
          label: 'Top Bowler',
          sub: `${topBowler.overs_bowled} overs`,
        })
      }

      if (potm) {
        list.push({
          short_name: (potm.player as any)?.short_name || '',
          value: potm.total_points,
          label: 'Player of the Match',
          sub: `${potm.total_points} pts`,
        })
      }

      setPerformers(list)
      setLoading(false)
    }
    fetchData()
  }, [matchId])

  // Draw canvas once data is ready
  useEffect(() => {
    if (loading) return
    drawCard()
  }, [loading, performers, potmName])

  async function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  async function drawCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 1080
    const H = 1080
    canvas.width = W
    canvas.height = H

    // ── Background: deep navy ─────────────────────────────────────────────
    ctx.fillStyle = '#05080f'
    ctx.fillRect(0, 0, W, H)

    // ── Subtle noise grain overlay ────────────────────────────────────────
    // Draw a subtle dot pattern for texture
    ctx.fillStyle = 'rgba(255,255,255,0.012)'
    for (let y = 0; y < H; y += 4) {
      for (let x = 0; x < W; x += 4) {
        if (Math.random() > 0.5) ctx.fillRect(x, y, 1, 1)
      }
    }

    // ── Gold diagonal accent stripe top-right ────────────────────────────
    ctx.save()
    ctx.globalAlpha = 0.07
    ctx.fillStyle = '#c9a84c'
    ctx.beginPath()
    ctx.moveTo(W * 0.55, 0)
    ctx.lineTo(W, 0)
    ctx.lineTo(W, H * 0.45)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // ── Bottom accent band ────────────────────────────────────────────────
    ctx.fillStyle = '#c9a84c'
    ctx.fillRect(0, H - 6, W, 6)

    // ── Top gold line ─────────────────────────────────────────────────────
    ctx.fillStyle = '#c9a84c'
    ctx.fillRect(0, 0, W, 4)

    // ── Left accent bar ───────────────────────────────────────────────────
    const resultColor = result === 'won' ? '#22c55e' : result === 'lost' ? '#f43f5e' : '#c9a84c'
    ctx.fillStyle = resultColor
    ctx.fillRect(0, 0, 8, H)

    // ── MVCC Logo (top-left) ──────────────────────────────────────────────
    try {
      const logo = await loadImage('/mavericks-logo.jpeg')
      const logoSize = 110
      const logoX = 48
      const logoY = 40

      // Circle clip for logo
      ctx.save()
      ctx.beginPath()
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
      ctx.restore()

      // Gold ring around logo
      ctx.strokeStyle = '#c9a84c'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2)
      ctx.stroke()
    } catch {
      // Logo failed to load — draw placeholder
      ctx.fillStyle = '#c9a84c'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText('MVCC', 48, 100)
    }

    // ── Club name (right of logo) ─────────────────────────────────────────
    ctx.fillStyle = '#c9a84c'
    ctx.font = '500 22px "Outfit", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('MAVERICKS CRICKET CLUB', 180, 78)

    ctx.fillStyle = 'rgba(201,168,76,0.55)'
    ctx.font = '400 16px "JetBrains Mono", monospace'
    ctx.fillText('INTERNAL T30 · 2026', 180, 106)

    // ── Match label ───────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '500 14px "JetBrains Mono", monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`MATCH ${matchNumber}  ·  ${ground.toUpperCase()}`, W - 48, 78)

    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.font = '400 13px "JetBrains Mono", monospace'
    ctx.fillText(formatDate(date).toUpperCase(), W - 48, 104)

    // ── Divider ───────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(201,168,76,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, 178)
    ctx.lineTo(W - 48, 178)
    ctx.stroke()

    // ── Result badge (center top) ─────────────────────────────────────────
    const resultText = result === 'won' ? 'VICTORY' : result === 'lost' ? 'DEFEAT' : result === 'tied' ? 'TIED' : 'NO RESULT'
    const resultEmoji = result === 'won' ? '🏆' : result === 'lost' ? '' : '🤝'

    // Badge background
    const badgeW = 280
    const badgeH = 52
    const badgeX = (W - badgeW) / 2
    const badgeY = 200

    ctx.fillStyle = result === 'won' ? 'rgba(34,197,94,0.15)' : result === 'lost' ? 'rgba(244,63,94,0.15)' : 'rgba(201,168,76,0.15)'
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10)
    ctx.fill()

    ctx.strokeStyle = resultColor + '60'
    ctx.lineWidth = 1.5
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10)
    ctx.stroke()

    ctx.fillStyle = resultColor
    ctx.font = `700 26px "Bebas Neue", sans-serif`
    ctx.textAlign = 'center'
    ctx.letterSpacing = '4px'
    ctx.fillText(resultText, W / 2, badgeY + 35)
    ctx.letterSpacing = '0px'

    // ── VS block ─────────────────────────────────────────────────────────
    const vsY = 290
    const colL = W / 2 - 200
    const colR = W / 2 + 200

    // MVCC label
    ctx.fillStyle = '#c9a84c'
    ctx.font = '600 18px "Outfit", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('MVCC', colL, vsY)

    // Opponent label
    ctx.fillStyle = '#3b82f6'
    ctx.font = '600 18px "Outfit", sans-serif'
    ctx.fillText(truncate(opponent.split(' ').slice(0, 3).join(' '), 20), colR, vsY)

    // Scores
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 72px "Bebas Neue", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(mvccScore?.split(' ')[0] || '–', colL, vsY + 80)
    ctx.fillText(opponentScore?.split(' ')[0] || '–', colR, vsY + 80)

    // Over details under score
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '400 15px "JetBrains Mono", monospace'
    const mvccOvers = mvccScore?.match(/\((.+)\)/)?.[1] || ''
    const oppOvers = opponentScore?.match(/\((.+)\)/)?.[1] || ''
    if (mvccOvers) ctx.fillText(`(${mvccOvers})`, colL, vsY + 106)
    if (oppOvers) ctx.fillText(`(${oppOvers})`, colR, vsY + 106)

    // VS circle
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.arc(W / 2, vsY + 40, 34, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '600 18px "Outfit", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('VS', W / 2, vsY + 48)

    // ── Divider ───────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, vsY + 140)
    ctx.lineTo(W - 48, vsY + 140)
    ctx.stroke()

    // ── Section label: KEY PERFORMERS ─────────────────────────────────────
    const perfY = vsY + 175

    ctx.fillStyle = 'rgba(201,168,76,0.7)'
    ctx.font = '500 12px "JetBrains Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('KEY PERFORMERS', 48, perfY)

    // ── Performer cards ───────────────────────────────────────────────────
    const cardW = (W - 96 - 24) / Math.max(performers.length, 1)
    const cardH = 160
    const cardY = perfY + 20
    const cardPad = 12

    performers.forEach((perf, i) => {
      const cx = 48 + i * (cardW + 12)

      // Card bg
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      roundRect(ctx, cx, cardY, cardW, cardH, 10)
      ctx.fill()

      ctx.strokeStyle = 'rgba(201,168,76,0.2)'
      ctx.lineWidth = 1
      roundRect(ctx, cx, cardY, cardW, cardH, 10)
      ctx.stroke()

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '500 11px "JetBrains Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(perf.label.toUpperCase(), cx + cardPad, cardY + 28)

      // Player name
      ctx.fillStyle = '#ffffff'
      ctx.font = `600 22px "Bebas Neue", sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(perf.short_name.toUpperCase(), cx + cardPad, cardY + 60)

      // Big value
      ctx.fillStyle = '#c9a84c'
      ctx.font = `700 54px "Bebas Neue", sans-serif`
      ctx.textAlign = 'left'
      const valStr = perf.label === 'Top Bowler'
        ? `${perf.value}W`
        : perf.label === 'Player of the Match'
        ? '🏅'
        : `${perf.value}`
      ctx.fillText(valStr, cx + cardPad, cardY + 125)

      // Sub label
      if (perf.sub && perf.label !== 'Player of the Match') {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = '400 13px "JetBrains Mono", monospace'
        ctx.textAlign = 'right'
        ctx.fillText(perf.sub, cx + cardW - cardPad, cardY + 148)
      }
    })

    // ── POTM banner (if exists, show below cards) ─────────────────────────
    if (potmName) {
      const potmY = cardY + cardH + 28

      ctx.fillStyle = 'rgba(201,168,76,0.12)'
      roundRect(ctx, 48, potmY, W - 96, 60, 10)
      ctx.fill()

      ctx.strokeStyle = 'rgba(201,168,76,0.3)'
      ctx.lineWidth = 1
      roundRect(ctx, 48, potmY, W - 96, 60, 10)
      ctx.stroke()

      ctx.fillStyle = '#c9a84c'
      ctx.font = '600 13px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('🏅  PLAYER OF THE MATCH', W / 2, potmY + 24)

      ctx.fillStyle = '#ffffff'
      ctx.font = `700 28px "Bebas Neue", sans-serif`
      ctx.fillText(potmName.toUpperCase(), W / 2, potmY + 50)
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const footerY = H - 60
    ctx.strokeStyle = 'rgba(201,168,76,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, footerY)
    ctx.lineTo(W - 48, footerY)
    ctx.stroke()

    ctx.fillStyle = 'rgba(201,168,76,0.5)'
    ctx.font = '400 14px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('MVCC INTERNAL T30 · MICHIGAN 2026 · mvcc-tracker-t30.vercel.app', W / 2, footerY + 28)

    setGenerating(false)
  }

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `MVCC-Match${matchNumber}-${result.toUpperCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Helper: rounded rect path
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const isWon = result === 'won'
  const accentColor = isWon ? 'var(--green)' : result === 'lost' ? 'var(--red)' : 'var(--gold)'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          maxHeight: '95vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}
        >
          <div>
            <div className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>
              MATCH SHARE CARD
            </div>
            <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
              1080×1080px · ready for Instagram & WhatsApp
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Canvas preview */}
        <div className="p-6">
          {loading ? (
            <div
              className="w-full aspect-square rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <div className="text-center">
                <div className="text-3xl mb-3">🏏</div>
                <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--text3)' }}>
                  GENERATING CARD...
                </div>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                display: 'block',
              }}
            />
          )}

          {/* Result pill */}
          {!loading && (
            <div className="flex items-center gap-2 mt-4">
              <div
                className="font-mono text-xs px-3 py-1.5 rounded-full"
                style={{
                  color: accentColor,
                  background: `${accentColor}18`,
                  border: `1px solid ${accentColor}35`,
                }}
              >
                {result.toUpperCase()} · Match {matchNumber}
              </div>
              <div className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                vs {truncate(opponent, 30)}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={download}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-display text-xl tracking-wider transition-all"
              style={{
                background: loading ? 'var(--bg3)' : 'var(--gold)',
                color: loading ? 'var(--text3)' : '#05080f',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: '1px solid transparent',
              }}
            >
              {loading ? 'GENERATING...' : '⬇ DOWNLOAD PNG'}
            </button>
            <button
              onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); drawCard() }, 100) }}
              className="px-4 py-3 rounded-xl font-mono text-xs tracking-widest transition-all"
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--text3)',
                cursor: 'pointer',
              }}
            >
              REFRESH
            </button>
          </div>

          <p className="font-mono text-xs text-center mt-3" style={{ color: 'var(--text3)' }}>
            Tip: download → share directly to Instagram story, WhatsApp, or status
          </p>
        </div>
      </div>
    </div>
  )
}
