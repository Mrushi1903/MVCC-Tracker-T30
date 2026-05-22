# MVCC Internal Tournament Tracker 🏏

## Project Overview
A live web app for tracking the **MVCC (Mavericks Cricket Club) Internal T30 Tournament 2026**.
Two internal teams — **Mighty Mavericks (MMs)** and **Hell Boys (HBs)** — compete across 8 MCA T30 league matches for individual and team points.

The app is publicly accessible (anyone with the link can view stats) with an admin-only section for entering scorecards after each match.

---

## Tech Stack
- **Frontend + API**: Next.js 15 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Google OAuth — admin only (mrushireddy2232@gmail.com)
- **Styling**: Tailwind CSS + custom CSS variables
- **Fonts**: Bebas Neue (display), Outfit (body), JetBrains Mono (data/labels)
- **Hosting**: Vercel

---

## Brand & Design
- **Primary color (MM)**: Gold `#c9a84c`
- **Secondary color (HB)**: Electric Blue `#3b82f6`
- **Background**: Deep Navy `#05080f`
- **Theme**: Dark, premium sports — ESPN/Bundesliga feel
- **Logo**: Mavericks CC horse logo at `public/mavericks-logo.jpeg`
- **Player photos**: `public/players/[Full Name].jpeg` — mapped in `lib/playerImages.ts`
- **Watermark**: Mavericks horse logo as pulsing background layer

---

## Rules — CRITICAL
1. **Never auto-push to GitHub** — always give files so Rushi copies and pushes himself
2. **Always give files as downloadable code** — not just inline text
3. **Build one feature at a time**, test before moving to next
4. **Admin emails allowlist** is hardcoded in `admin/page.tsx` and `MobileNav.tsx`:
   ```ts
   const ADMIN_EMAILS = ['mrushireddy2232@gmail.com']
   ```
   Adding more admins = add email to this array in both files
5. **POTM is NEVER auto-assigned** — always manual in admin panel
6. **Minimum 1 complete over** for bowling points to count

---

## The Two Teams

### 🟡 MIGHTY MAVERICKS (MMs) — 11 Players
| Short Name | Full Name | Jersey |
|---|---|---|
| Amar | Amarendra Nuvvala | — |
| Gani | (gani)siva Ganesh Asodi | #18 |
| Mahendra | Mahender Bureddy | — |
| Manoj | Sai Manoj Kagolanu | — |
| Nithin | Nithin Reddy Musku | — |
| Rahul | Rahul Menon | — |
| Raheel | Raheel Shaik | #63 |
| Ravi | Ravi Kumar Pattipati | #45 |
| Rohith | Rohith Maddipati | — |
| Rupendra | Rupendra Chowdary Palakurthi | #19 |
| Yeswanth | Yeshwanth Kumar Mutcherla | — |

### 🔵 HELL BOYS (HBs) — 11 Players
| Short Name | Full Name | Jersey |
|---|---|---|
| Akshay | Akshay Raju | #18 |
| Hemanth | Hemanth Kasa | #12 |
| Karthik | Karthik Balakrishna | #15 |
| Koushik | Kousik Dhanekula | #6 |
| Naveen | Naveen Kumar Peddi | — |
| Nikhil | Nikhil Pasula | — |
| Rushi | Rushi Vardan Reddy Maddi | #3 |
| Saran | Saran Damacharla | #14 |
| Siddarth | Siddharth Chawla | — |
| Suman | Suman Reddy Gaddam | — |
| Viswa | Viswanath Kasu | — |

---

## Points System

### Base Points
| Action | Points |
|---|---|
| Each Run | +1 |
| Each Wicket | +20 |
| Each Catch | +10 |
| Runout (Fielder) | +10 |
| Runout (Helper) | +5 |
| Stumping | +10 |

### Batting Bonus (tiered — only highest applies)
| Milestone | Bonus |
|---|---|
| 30+ runs | +10 |
| 50+ runs | +20 |
| 100+ runs | +40 |

### Bowling Bonus
| Condition | Bonus |
|---|---|
| Economy < 4 runs/over AND ≥1 wicket AND ≥1 over | +10 |

### Award Bonus
| Award | Points |
|---|---|
| Player of the Match (POTM) | +30 |
| Team MVP of the Year | +50 |

---

## Database Schema (Supabase)
- **players** — 22 players with team, jersey, CC player ID
- **matches** — 8 season matches + opponent_short field
- **performances** — MVCC per-player per-match stats + calculated points
- **opponent_batting** — opponent batsmen stats per match (NEW)
- **opponent_bowling** — opponent bowler stats per match (NEW)

---

## Season Schedule (2026)
| # | Date | Time | Opponent | Ground | Status |
|---|---|---|---|---|---|
| 1 | May 16 | 9:00 AM | Michigan Rangers CC | Belle-Isle | ✅ LOST |
| 2 | May 30 | 2:30 PM | Michigan International CA Chargers | Lyon Oaks | Upcoming |
| 3 | Jun 6  | 9:00 AM | Michigan Warriors | Clinton | Upcoming |
| 4 | Jun 13 | 9:00 AM | Detroit Super Kings CC Bulls | Clinton | Upcoming |
| 5 | Jun 27 | 9:00 AM | Majestic Lions CC | Jayne | Upcoming |
| 6 | Jul 11 | 2:30 PM | The Squad Cricket Club | Sterling Heights | Upcoming |
| 7 | Jul 18 | 9:00 AM | Royal Bengals CC | Lyon Oaks | Upcoming |
| 8 | Jul 25 | 9:00 AM | Motown CC | Sterling Heights | Upcoming |

---

## Project Structure
```
mvcc-app/
├── app/
│   ├── page.tsx              # Home — leaderboard + podium
│   ├── layout.tsx            # Root layout + MobileNav
│   ├── globals.css           # Global styles + CSS variables + animations
│   ├── schedule/page.tsx     # Match schedule
│   ├── rules/page.tsx        # Points rules + FAQ
│   ├── admin/page.tsx        # Google OAuth admin scorecard entry
│   └── auth/callback/route.ts # OAuth callback handler
├── components/
│   ├── Nav.tsx               # Desktop top navigation (hidden on mobile)
│   ├── MobileNav.tsx         # Mobile bottom navigation (4 tabs)
│   ├── TeamBanner.tsx        # MM vs HB total points + progress bar
│   ├── PlayerModal.tsx       # Click player → stats modal with photo
│   ├── ScorecardModal.tsx    # Full match scorecard (both innings)
│   ├── ScheduleCard.tsx      # Match card — clickable if completed
│   ├── BackgroundCanvas.tsx  # Animated canvas — particles/aurora/rings
│   └── HorseWatermark.tsx    # Mavericks horse logo watermark
├── lib/
│   ├── supabase.ts           # Supabase client + TypeScript types
│   ├── points.ts             # Points calculation engine
│   ├── parseCSV.ts           # CricClub CSV parser (MVCC + opponent)
│   └── playerImages.ts       # short_name → filename map for photos
└── public/
    ├── mavericks-logo.jpeg   # Club logo (also used as watermark)
    └── players/              # 22 player photos (Full Name.jpeg format)
```

---

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://tptzsphhcuvbbnkuhisr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key in Vercel>
```

---

## Admin Workflow
1. Go to `/admin` on live URL
2. Sign in with Google (mrushireddy2232@gmail.com)
3. Select the match
4. Upload CricClub CSV export
5. Parser auto-fills ALL stats — MVCC batting/bowling/fielding + opponent batting/bowling
6. Preview opponent stats shown in admin before saving
7. Confirm result + scores
8. Hit **SAVE SCORECARD** — everything updates live

---

## Completed Features ✅
- Live leaderboard with count-up animation
- Top 3 podium with gold shimmer + floating medal
- Player modal with match breakdown + real photos
- Schedule page with completed/upcoming sections
- Full match scorecard modal (Cricbuzz-style, both innings)
- Admin CSV upload — captures ALL stats including opponent
- Google OAuth admin login (email allowlist)
- Rules page with FAQ
- Mobile bottom nav (4 tabs — admin tab shows if logged in)
- MAVERICKS CC branding — navy/gold/blue theme
- Animated background (particles, aurora glows, cricket field rings)
- Horse watermark with breathing animation + rotating rings
- Player profile photos on leaderboard, podium, modals
- Opponent batting + bowling stored in Supabase

## Remaining Features 🔜
- Match Share Card (PNG download for Instagram/WhatsApp)
- Hot 🔥 / Cold ❄️ streak indicators
- Individual player profile page /player/[name]
- Career stats graph (points per match)
- Season milestones tracker
- Multi-tournament architecture
- Season summary / awards page
