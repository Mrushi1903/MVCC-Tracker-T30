// MVCC opponent team logos.
// Files live in /public/logos/opponents/ with their original CricClub names
// (which contain spaces). Paths below are URL-encoded so they work everywhere
// — <img src>, fetch(), and @vercel/og's ImageResponse.
export const OPPONENT_LOGOS: Record<string, string> = {
  'Michigan Rangers CC':                  '/logos/opponents/MI%20Rangers.jpeg',
  'Michigan International CA Chargers':   '/logos/opponents/Michigan%20Internation%20CA%20Chargers%20MICC.jpeg',
  'Michigan Warriors':                    '/logos/opponents/Michigan%20Warriors%20MIWA.jpeg',
  'Detroit Super Kings CC Bulls':         '/logos/opponents/Detroit%20Super%20Kings%20CC%20bulls%20DSKB.jpeg',
  'Majestic Lions CC':                    '/logos/opponents/Majestic%20Lions%20CC%20MLCC.jpeg',
  'The Squad Cricket Club':               '/logos/opponents/The%20Squad%20Cricket%20Club%20TSXI.jpeg',
  'Royal Bengals CC':                     '/logos/opponents/Royal%20Bengals%20CC%20RBCC.jpg',
  'Motown CC':                            '/logos/opponents/Motown%20CC%20MOCC.jpeg',
}

export function getOpponentLogo(opponent: string | null | undefined): string | null {
  if (!opponent) return null
  if (OPPONENT_LOGOS[opponent]) return OPPONENT_LOGOS[opponent]
  // Try fuzzy match for slight name variations.
  const norm = opponent.toLowerCase().trim()
  for (const [k, v] of Object.entries(OPPONENT_LOGOS)) {
    if (k.toLowerCase() === norm) return v
    if (k.toLowerCase().includes(norm) || norm.includes(k.toLowerCase())) return v
  }
  return null
}

export function getOpponentInitials(opponent: string | null | undefined): string {
  if (!opponent) return '?'
  return opponent
    .split(/\s+/)
    .filter(w => w && !/^cc$/i.test(w))
    .slice(0, 3)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}
