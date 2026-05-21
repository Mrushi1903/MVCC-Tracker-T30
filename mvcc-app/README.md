# 🏏 MVCC Internal Tournament Tracker — T30 2026

> **Live app:** [mvcc-tracker-t30.vercel.app](https://mvcc-tracker-t30.vercel.app)

A real-time cricket points tracker built for **Mavericks Cricket Club's** internal T30 season — Mighty Mavericks vs Hell Boys across 8 matches. Built as a full-stack portfolio project using Next.js 15, Supabase, and Vercel.

---

## 📸 Features

| Feature | Details |
|---|---|
| **Live Leaderboard** | All 22 players ranked by tournament points, updated after every match |
| **Team Banner** | MM vs HB running totals with animated progress bar |
| **Player Modal** | Click any player → full match-by-match breakdown with point chips |
| **Schedule Page** | All 8 matches with date, venue, opponent, and result status |
| **Admin Panel** | Password-protected scorecard entry with CSV auto-upload |
| **CSV Parser** | Auto-parses CricClub export CSVs — batting, bowling, fielding all extracted |
| **Points Engine** | Configurable scoring rules: runs, wickets, catches, POTM, economy bonus |

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

---

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + Realtime) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + custom CSS variables |
| **Deployment** | [Vercel](https://vercel.com/) |
| **Scorecard Source** | [CricClub](https://cricclubapp.com/) CSV exports |

---

## 🗄️ Database Schema

```sql
-- Players table (22 players, 11 per team)
players (id, name, short_name, team, jersey_number, cc_player_id)

-- Matches table (8 T30 matches)
matches (id, match_number, date, time, opponent, ground,
         is_played, result, mvcc_score, opponent_score, potm_player_id)

-- Performances table (per player per match)
performances (id, match_id, player_id,
              runs, balls_faced, fours, sixes,
              overs_bowled, runs_conceded, wickets, maidens,
              catches, runout_fielder, runout_helper, stumpings,
              batting_points, bowling_points, fielding_points, bonus_points,
              total_points, is_potm)
```

---

## 🚀 Local Development

```bash
# Clone the repo
git clone https://github.com/Mrushi1903/MVCC-Tracker-T30.git
cd MVCC-Tracker-T30/mvcc-app

# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key

# Run dev server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📊 Admin Workflow

1. Go to `/admin` → enter password
2. Select the match number
3. Upload the CricClub CSV export (from the scorecard page → **Export to Excel/CSV**)
4. Parser auto-fills batting (runs, balls, 4s, 6s), bowling (overs, runs, wickets), and fielding (catches, stumpings, run-outs)
5. Review/edit any fields manually
6. Set match result and scores
7. Click **SAVE SCORECARD** → leaderboard updates instantly

---

## 📁 Project Structure

```
mvcc-app/
├── app/
│   ├── page.tsx          # Leaderboard (homepage)
│   ├── schedule/
│   │   └── page.tsx      # Match schedule
│   ├── admin/
│   │   └── page.tsx      # Admin scorecard entry
│   └── layout.tsx        # Root layout + global styles
├── components/
│   ├── Nav.tsx           # Navigation bar
│   ├── TeamBanner.tsx    # MM vs HB score banner
│   ├── ScheduleCard.tsx  # Individual match card
│   └── PlayerModal.tsx   # Player stats drawer
└── lib/
    ├── supabase.ts       # Supabase client + types
    ├── parseCSV.ts       # CricClub CSV parser
    └── points.ts         # Points calculation engine
```

---

## 🏗️ Built By

**Rushi Maddi** — Service Desk Analyst L2/L3 at Coretek, transitioning to AI Cloud Engineering.

- 🔗 [LinkedIn](https://linkedin.com/in/maddi-rushi)
- 💻 [GitHub](https://github.com/Mrushi1903)
- 🌐 Portfolio: *coming soon*

> This project is part of a portfolio demonstrating full-stack development, database design, and real-world product thinking — built for actual use by MVCC players during the 2026 season.

---

## 📌 Roadmap

- [x] Live leaderboard with team totals
- [x] Player modal with match breakdown
- [x] Schedule page
- [x] Admin CSV upload + auto-parse
- [x] Points engine with all rules
- [ ] Google OAuth for admin login
- [ ] Match-level stats page
- [ ] Push notifications for match results
- [ ] Season summary / awards page

---

*Michigan 2026 · MVCC Internal T30 Tournament*
