'use client'

import Image from 'next/image'

export default function HorseWatermark() {
  return (
    <>
      <style>{`
        @keyframes horseBreathe {
          0%, 100% {
            opacity: 0.038;
            transform: translate(-50%, -50%) scale(1);
            filter: brightness(0) sepia(1) saturate(3) hue-rotate(5deg) blur(0.5px);
          }
          30% {
            opacity: 0.055;
            transform: translate(-50%, -50%) scale(1.018);
            filter: brightness(0) sepia(1) saturate(4) hue-rotate(5deg) blur(0px);
          }
          60% {
            opacity: 0.042;
            transform: translate(-50%, -50%) scale(1.008);
            filter: brightness(0) sepia(1) saturate(3.5) hue-rotate(5deg) blur(0.3px);
          }
        }

        @keyframes horseGlowPulse {
          0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(0.95); }
          50%       { opacity: 0.28; transform: translate(-50%, -50%) scale(1.05); }
        }

        @keyframes horseRingRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes horseRingRotateReverse {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(-360deg); }
        }
      `}</style>

      {/* Outer glow ring */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        width: 700, height: 700,
        borderRadius: '50%',
        border: '1px solid rgba(201,168,76,0.06)',
        animation: 'horseRingRotate 40s linear infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Inner glow ring reverse */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        width: 520, height: 520,
        borderRadius: '50%',
        border: '1px dashed rgba(201,168,76,0.05)',
        animation: 'horseRingRotateReverse 28s linear infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Radial glow behind horse */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.02) 40%, transparent 70%)',
        animation: 'horseGlowPulse 8s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* The actual horse logo as watermark */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        width: 480, height: 480,
        pointerEvents: 'none', zIndex: 0,
        animation: 'horseBreathe 10s ease-in-out infinite',
      }}>
        <Image
          src="/mavericks-logo.jpeg"
          alt=""
          fill
          style={{
            objectFit: 'contain',
            objectPosition: 'center top', // Focus on horse head, crop bottom text
          }}
          priority={false}
        />
      </div>
    </>
  )
}
