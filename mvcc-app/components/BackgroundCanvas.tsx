'use client'

import { useEffect, useRef } from 'react'

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    let frame = 0
    let animId: number

    // ── PARTICLES ──────────────────────────────────────────
    const particles = Array.from({ length: 80 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.3,
      op: Math.random() * 0.45 + 0.08,
      color: i % 3 === 0 ? [201,168,76] : i % 3 === 1 ? [59,130,246] : [201,168,76],
      phase: Math.random() * Math.PI * 2,
    }))

    function drawBackground() {
      if (!ctx) return
      ctx.fillStyle = '#05080f'
      ctx.fillRect(0, 0, W, H)

      // Gold aurora top-left
      const ag = ctx.createRadialGradient(W * 0.12, 0, 0, W * 0.12, 0, W * 0.6)
      ag.addColorStop(0, `rgba(201,168,76,${0.07 + Math.sin(frame * 0.007) * 0.025})`)
      ag.addColorStop(0.6, `rgba(160,120,40,${0.025})`)
      ag.addColorStop(1, 'transparent')
      ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H)

      // Blue aurora bottom-right
      const ab = ctx.createRadialGradient(W * 0.9, H, 0, W * 0.9, H, W * 0.55)
      ab.addColorStop(0, `rgba(59,130,246,${0.07 + Math.cos(frame * 0.006) * 0.025})`)
      ab.addColorStop(0.6, `rgba(30,80,200,${0.025})`)
      ab.addColorStop(1, 'transparent')
      ctx.fillStyle = ab; ctx.fillRect(0, 0, W, H)

      // Center subtle gold
      const cg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.38)
      cg.addColorStop(0, `rgba(201,168,76,${0.022 + Math.sin(frame * 0.005) * 0.008})`)
      cg.addColorStop(1, 'transparent')
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H)
    }

    function drawCricketRings() {
      if (!ctx) return
      const cx = W/2, cy = H/2
      const t  = frame * 0.003
      const minD = Math.min(W, H)

      const rings = [
        { r: minD * 0.40, op: 0.035, dash: [3, 22],  speed:  0.25 },
        { r: minD * 0.30, op: 0.050, dash: [6, 18],  speed: -0.20 },
        { r: minD * 0.20, op: 0.065, dash: [10, 14], speed:  0.15 },
        { r: minD * 0.11, op: 0.080, dash: [14,  8], speed: -0.12 },
      ]

      rings.forEach((ring, i) => {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(t * ring.speed)
        ctx.beginPath()
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2)
        ctx.setLineDash(ring.dash)
        ctx.strokeStyle = `rgba(201,168,76,${ring.op + Math.sin(t * 1.5 + i * 0.8) * 0.015})`
        ctx.lineWidth = 0.8
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      })

      // Pitch centre oval
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.04)
      ctx.beginPath()
      ctx.ellipse(0, 0, minD * 0.06, minD * 0.025, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(201,168,76,0.06)`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }

    function drawLightBeams() {
      if (!ctx) return
      const cx = W/2, cy = H * 0.28
      const t  = frame * 0.004

      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + t * (i % 2 === 0 ? 0.25 : -0.18)
        const dist  = Math.min(W, H) * 0.55
        const bx    = cx + Math.cos(angle) * dist
        const by    = cy + Math.sin(angle) * dist
        const op    = (Math.sin(t * 1.8 + i * 1.1) * 0.5 + 0.5) * 0.012

        const g = ctx.createLinearGradient(cx, cy, bx, by)
        g.addColorStop(0, `rgba(201,168,76,${op * 4})`)
        g.addColorStop(0.3, `rgba(201,168,76,${op})`)
        g.addColorStop(1, 'transparent')

        const spread = 25 + Math.sin(t + i) * 8
        const px = Math.cos(angle + Math.PI/2) * spread
        const py = Math.sin(angle + Math.PI/2) * spread

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(bx + px, by + py)
        ctx.lineTo(bx - px, by - py)
        ctx.closePath()
        ctx.fillStyle = g
        ctx.fill()
      }
    }

    function drawParticles() {
      if (!ctx) return
      const t = frame * 0.012
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
        const op = p.op * (0.65 + Math.sin(t + p.phase) * 0.35)
        const [r,g,b] = p.color
        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x
          const dy = p.y - particles[j].y
          const d  = Math.sqrt(dx*dx + dy*dy)
          if (d < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(201,168,76,${0.055 * (1 - d/120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${op})`
        ctx.fill()
      })
    }

    function drawScanlines() {
      if (!ctx) return
      for (let y = 0; y < H; y += 5) {
        ctx.fillStyle = 'rgba(0,0,0,0.025)'
        ctx.fillRect(0, y, W, 1)
      }
    }

    function drawVignette() {
      if (!ctx) return
      const g = ctx.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.9)
      g.addColorStop(0, 'transparent')
      g.addColorStop(1, 'rgba(2,4,10,0.72)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }

    function animate() {
      frame++
      drawBackground()
      drawLightBeams()
      drawCricketRings()
      drawParticles()
      drawScanlines()
      drawVignette()
      animId = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
      particles.forEach(p => { p.x = Math.random() * W; p.y = Math.random() * H })
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0,
    }} />
  )
}
