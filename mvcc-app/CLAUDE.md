# MVCC Internal Tournament Tracker 🏏

## Project Overview
A live web app for tracking the **MVCC (Mavericks Cricket Club) Internal T30 Tournament 2026**.
Two internal teams — **Mighty Mavericks (MMs)** and **Hell Boys (HBs)** — compete across 8 MCA T30 league matches for individual and team points.

The app is publicly accessible (anyone with the link can view stats) with an admin-only section for entering scorecards after each match.

---

## Tech Stack
- **Frontend + API**: Next.js 14 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + custom CSS variables
- **Fonts**: Bebas Neue (display), Outfit (body), JetBrains Mono (data/labels)
- **Hosting**: Vercel (free tier)
- **Auth**: Simple password protection on admin page (password: `mvcc2026`)

---

## The Two Teams

### 🟠 MIGHTY MAVERICKS (MMs) — 11 Players
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

### Batting Bonus
| Milestone | Bonus |
|---|---|
| 30+ runs | +10 |
| 50+ runs | +20 |
| 100+ runs | +40 |

> Milestones are tiered (not stacked) — only the highest tier applies.

### Bowling Bonus
| Condition | Bonus |
|---|---|
| Economy < 4 runs/over AND ≥1 wicket | +10 |

> **Rule**: Bowler must bowl a **minimum of 1 complete over** for any bowling points (wickets + economy bonus) to count.

### Award Bonus
| Award | Points |
|---|---|
| Player of the Match (POTM) | +30 |
| Team MVP of the Year | +50 |

---

## Season Schedule (2026)
| # | Date | Time | Opponent | Ground |
|---|---|---|---|---|
| 1 | May 16 | 9:00 AM | Michigan Rangers CC | Belle-Isle |
| 2 | May 30 | 2:30 PM | Michigan International CA Chargers | Lyon Oaks |
| 3 | Jun 6 | 9:00 AM | Michigan Warriors | Clinton |
| 4 | Jun 13 | 9:00 AM | Detroit Super Kings CC Bulls | Clinton |
| 5 | Jun 27 | 9:00 AM | Majestic Lions CC | Jayne |
| 6 | Jul 11 | 2:30 PM | The Squad Cricket Club | Sterling Heights |
| 7 | Jul 18 | 9:00 AM | Royal Bengals CC | Lyon Oaks |
| 8 | Jul 25 | 9:00 AM | Motown CC | Sterling Heights |

---

## Project Structure
```
mvcc-app/
├── app/
│   ├── page.tsx              # Home — leaderboard + schedule tabs
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles + CSS variables
│   └── admin/
│       └── page.tsx          # Password-protected scorecard entry
├── components/
│   ├── Nav.tsx               # Top navigation bar
│   ├── TeamBanner.tsx        # MM vs HB total points + progress bar
│   ├── PlayerModal.tsx       # Click player → stats modal
│   └── ScheduleCard.tsx      # Individual match card
├── lib/
│   ├── supabase.ts           # Supabase client + TypeScript types
│   └── points.ts             # Points calculation engine (all rules)
├── schema.sql                # Full Supabase DB schema + seed data
├── .env.local                # Local env vars (gitignored)
└── .env.production           # Production env vars reference
```

---

## Database Schema (Supabase)

### Tables
- **players** — all 22 players with team, jersey, CC player ID
- **matches** — 8 season matches with date, opponent, ground, result
- **performances** — per-player per-match stats + calculated points

### Key Rules in `lib/points.ts`
- Runs × 1
- Wickets × 20 (only if overs_bowled ≥ 1)
- Economy bonus: runs_conceded / overs_bowled < 4 AND wickets ≥ 1 AND overs ≥ 1
- Batting milestone: tiered (30+/50+/100+), highest applies only
- POTM: +30, MVP: +50

---

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://tptzsphhcuvbbnkuhisr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ADMIN_PASSWORD=mvcc2026
```

---

## Running Locally
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Deploying to Vercel
1. Push to GitHub (`Mrushi1903/mvcc-tracker`)
2. Import repo in Vercel dashboard
3. Add the 3 environment variables above
4. Deploy — done!

Every `git push` to `main` auto-deploys to Vercel.

---

## Admin Workflow (After Each Match)
1. Go to `/admin` on the live URL
2. Enter password: `Enter password when prompted`
3. Select the match
4. Enter result + scores
5. Fill in stats for every player who played
6. Hit **SAVE SCORECARD** — points auto-calculate and leaderboard updates live

---

## Future Enhancements
- [ ] Google OAuth login for admin (replace password)
- [ ] Match MVP voting
- [ ] Season-end awards page
- [ ] WhatsApp-shareable match summary card
- [ ] Push notifications after scorecard is entered
