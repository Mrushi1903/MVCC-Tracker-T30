# 🏏 MVCC Internal Tournament Tracker — T30 2026

> **Live app:** [mvcc-tracker-t30.vercel.app](https://mvcc-tracker-t30.vercel.app)

A real-time cricket points tracker built for **Mavericks Cricket Club's** internal T30 season — Mighty Mavericks vs Hell Boys across 8 matches. Built as a full-stack portfolio project using Next.js 15, Supabase, and Vercel.

---

## 📸 Features

| Feature | Details |
|---|---|
| **Live Leaderboard** | All 22 players ranked by tournament points, updated after every match |
| **Top 3 Podium** | Gold/silver/bronze cards with shimmer animation and real player photos |
| **Team Banner** | MM vs HB running totals with animated progress bar + count-up numbers |
| **Player Modal** | Click any player → full match-by-match breakdown with point chips + photo |
| **Schedule Page** | All 8 matches with date, venue, opponent, and result status |
| **Scorecard Modal** | Click any completed match → full Cricbuzz-style scorecard (both innings) |
| **Admin Panel** | Google OAuth login, CSV auto-upload, opponent stats saved automatically |
| **CSV Parser** | Auto-parses CricClub export CSVs — MVCC + opponent batting/bowling extracted |
| **Points Engine** | Configurable scoring rules: runs, wickets, catches, POTM, economy bonus |
| **Rules Page** | Full points breakdown, important notes, FAQ |
| **Mobile Bottom Nav** | 4-tab navigation — Standings, Schedule, Rules, Admin (if logged in) |
| **Animated Background** | Particle network, aurora glows, cricket field rings, horse watermark |
| **Player Profile Photos** | Real player photos on leaderboard, podium and modals |
| **MAVERICKS CC Branding** | Navy + gold theme, Mavericks logo in nav, horse watermark |

---

## 🧮 Points System

| Category | Points |
|---|---|
| Run scored | 1 pt |
| Wicket taken | 20 pts |
| Catch | 10 pts |
| Run out (primary fielder) | 10 pts |
| Run out (helper) | 5 pts |
| Stumping | 10 pts |
| Batting: 30+ runs | +10 bonus |
| Batting: 50+ runs | +20 bonus |
| Batting: 100+ runs | +40 bonus |
| Bowling economy < 4 (min 1 over, ≥1 wkt) | +10 bonus |
| Player of the Match | +30 pts |
| MVP (season award) | +50 pts |

> Minimum **1 complete over** required for bowling points to count.
> Batting milestones are **tiered** — only the highest applies.

---

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + Realtime) |
| **Auth** | Supabase Google OAuth (admin only) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + custom CSS variables |
| **Deployment** | [Vercel](https://vercel.com/) |
| **Scorecard Source** | [CricClub](https://cricclubapp.com/) CSV exports |

---

## 🗄️ Database Schema

```sql
-- Players table (22 players, 11 per team)
players (id, name, short_name, team, jersey_number, cc_player_id)

-- Matches table (8 T30 matches)
matches (id, match_number, date, time, opponent, opponent_short, ground,
         is_played, result, mvcc_score, opponent_score, potm_player_id)

-- Performances table (MVCC players per match)
performances (id, match_id, player_id,
              runs, balls_faced, fours, sixes,
              overs_bowled, runs_conceded, wickets, maidens,
              catches, runout_fielder, runout_helper, stumpings,
              batting_points, bowling_points, fielding_points, bonus_points,
              total_points, is_potm)

-- Opponent batting (NEW)
opponent_batting (id, match_id, player_name, runs, balls, fours, sixes, how_out)

-- Opponent bowling (NEW)
opponent_bowling (id, match_id, player_name, overs, maidens, runs_conceded, wickets)
```

---

## 🚀 Local Development

```bash
git clone https://github.com/Mrushi1903/MVCC-Tracker-T30.git
cd MVCC-Tracker-T30/mvcc-app
npm install
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📊 Admin Workflow

1. Go to `/admin` → Sign in with Google (authorised emails only)
2. Select the match number
3. Upload the CricClub CSV export
4. Parser auto-fills MVCC batting, bowling, fielding + opponent batting + bowling
5. Preview opponent stats in the admin panel before saving
6. Set match result and scores
7. Click **SAVE SCORECARD** → leaderboard + scorecard updates instantly

---

## 📁 Project Structure

```
mvcc-app/
├── app/
│   ├── page.tsx              # Leaderboard (homepage)
│   ├── schedule/page.tsx     # Match schedule
│   ├── rules/page.tsx        # Points rules + FAQ
│   ├── admin/page.tsx        # Google OAuth admin panel
│   └── auth/callback/route.ts # OAuth callback
├── components/
│   ├── Nav.tsx               # Desktop navigation
│   ├── MobileNav.tsx         # Mobile bottom navigation
│   ├── TeamBanner.tsx        # MM vs HB banner with count-up
│   ├── ScheduleCard.tsx      # Match card (clickable if played)
│   ├── ScorecardModal.tsx    # Full match scorecard popup
│   ├── PlayerModal.tsx       # Player stats drawer
│   ├── BackgroundCanvas.tsx  # Animated particle/aurora background
│   └── HorseWatermark.tsx    # Mavericks horse watermark
├── lib/
│   ├── supabase.ts           # Supabase client + types
│   ├── parseCSV.ts           # CricClub CSV parser (MVCC + opponent)
│   ├── points.ts             # Points calculation engine
│   └── playerImages.ts       # Player photo filename map
└── public/
    ├── mavericks-logo.jpeg   # MVCC logo
    └── players/              # Player profile photos (22 players)
```

---

## 📌 Roadmap

### ✅ Done
- [x] Live leaderboard with team totals + count-up animation
- [x] Top 3 podium with player photos + gold shimmer
- [x] Player modal with match breakdown + photos
- [x] Schedule page
- [x] Full match scorecard (both innings)
- [x] Admin CSV upload + auto-parse (MVCC + opponent stats)
- [x] Google OAuth admin login
- [x] Rules page with FAQ
- [x] Mobile bottom nav (4 tabs)
- [x] MAVERICKS CC branding + navy/gold theme
- [x] Animated background (particles, aurora, cricket rings, horse watermark)
- [x] Player profile photos
- [x] Opponent batting + bowling stored in DB

### 🔜 Coming Next
- [ ] Match Share Card (downloadable PNG for Instagram/WhatsApp)
- [ ] Hot 🔥 / cold ❄️ streak indicators per player
- [ ] Individual player profile page /player/[name]
- [ ] Career stats graph — points per match over season
- [ ] Season milestones (100 runs, 10 wickets countdowns)
- [ ] Multi-tournament architecture (T30 + T20)
- [ ] Player profile pictures from CricClub
- [ ] Season summary / awards page
- [ ] Push notifications for match results

---

## 🏗️ Built By

**Rushi Maddi** — Service Desk Analyst L2/L3 at Coretek, transitioning to AI Cloud Engineering.

- 🔗 [LinkedIn](https://linkedin.com/in/maddi-rushi)
- 💻 [GitHub](https://github.com/Mrushi1903)

> This project is part of a portfolio demonstrating full-stack development, database design, real-world product thinking and UI/UX — built for actual use by MVCC players during the 2026 season.

---

*Michigan 2026 · MVCC Internal T30 Tournament · #MaverickSpirit*
