# MVCC Tournament Tracker — Claude session context 🏏

This file is the source of truth for any AI session working on this codebase. Keep it accurate.

---

## Project overview

A multi-tournament cricket tracker for **Mavericks Cricket Club**. Two internal teams — **Mighty Mavericks (MMs)** and **Hell Boys (HBs)** — compete across MCA T30 league matches. Publicly readable, admin-gated for data entry.

- **Live**: https://mvcc-tracker-t30.vercel.app
- **Repo**: https://github.com/Mrushi1903/MVCC-Tracker-T30
- **Hosting**: Vercel (auto-deploys from `main`)
- **DB**: Supabase project `tptzsphhcuvbbnkuhisr`

---

## Tech stack

- **Frontend + API**: Next.js 15 (App Router, TypeScript, React 19)
- **Database**: Supabase (PostgreSQL + RLS + Realtime)
- **Auth**: Supabase Google OAuth (admin allowlist enforced in app)
- **Styling**: Tailwind CSS + CSS variables for theme
- **Animations**: Framer Motion (springs, layoutId tab indicators, count-up)
- **Charts**: recharts (lazy-loaded via `next/dynamic`)
- **PWA / OG**: `next/og` + Next 15 manifest convention
- **Fonts**: Bebas Neue (display), Outfit (body), JetBrains Mono (data)
- **Deploy**: Vercel, env vars in project settings

---

## CRITICAL operating rules

1. **Never auto-push to GitHub.** Always hand files to Rushi to push himself.
2. **Give files as complete code blocks**, not just inline snippets.
3. **Build one feature at a time**, test before moving on.
4. **Run SQL migrations BEFORE pushing code that references new columns.** Otherwise the live site fails silently with empty rows. `handleSave` now surfaces Supabase errors but prevention > detection.
5. **POTM is NEVER auto-assigned** — always a manual admin toggle.
6. **Minimum 1 complete over** for bowling points to count.
7. **External players don't count toward team totals** but their stats still show individually.
8. **Idempotent migrations only** — every `CREATE TABLE IF NOT EXISTS`, every `ADD COLUMN IF NOT EXISTS`.
9. **Default to no-cache on new image routes.** Cache only after the renderer is proven stable. (Learned from a 0-byte PNG that got cached for 5 minutes across all visitors.)
10. **Admin emails allowlist** lives in `app/t30/admin/page.tsx` AND `components/MobileNav.tsx` — keep both in sync:
    ```ts
    const ADMIN_EMAILS = [
      'mrushireddy2232@gmail.com',  // Rushi
      'viswakasu@gmail.com',        // Viswa — HB Captain
      'rohitmaddipati@gmail.com',   // Rohith — HB VC
    ]
    ```

---

## Brand & design

- **Background**: `#0B1020` (deep navy)
- **MM (gold)**: `#c9a84c`
- **HB (electric blue)**: `#38bdf8`
- **Accent (neon cyan)**: `#00E5FF`
- **Gold (leading team)**: `#F59E0B`
- **Success**: `#4ADE80`
- **Danger**: `#f43f5e`
- **Glass card**: `rgba(255,255,255,0.06)` + `backdrop-filter: blur(12px)` + `1px solid rgba(255,255,255,0.10)` border
- **Theme**: dark, premium sports — ESPN/Bundesliga feel
- **Logo**: `/public/mavericks-logo.jpeg`
- **Player photos**: `/public/players/[Full Name].jpeg` mapped in `lib/playerImages.ts`
- **Team PIN for availability form**: `MVCC2026`

---

## The 22 players

### 🟡 Mighty Mavericks (MM)
Amar (Amarendra Nuvvala), Gani ((gani)siva Ganesh Asodi #18), Mahendra (Mahender Bureddy), Manoj (Sai Manoj Kagolanu), Nithin (Nithin Reddy Musku), Rahul (Rahul Menon), Raheel (Raheel Shaik #63), Ravi (Ravi Kumar Pattipati #45), Rohith (Rohith Maddipati), Rupendra (Rupendra Chowdary Palakurthi #19), Yeswanth (Yeshwanth Kumar Mutcherla).

### 🔵 Hell Boys (HB)
Akshay (Akshay Raju #18), Hemanth (Hemanth Kasa #12), Karthik (Karthik Balakrishna #15), Koushik (Kousik Dhanekula #6), Naveen (Naveen Kumar Peddi), Nikhil (Nikhil Pasula), Rushi (Rushi Vardan Reddy Maddi #3), Saran (Saran Damacharla #14), Siddarth (Siddharth Chawla), Suman (Suman Reddy Gaddam), Viswa (Viswanath Kasu).

> **Team leadership:** Viswa is HB Captain, Rohith is HB VC. Both are admins. MM captaincy not formally recorded yet.

---

## Points system

### Base
| Action | Points |
|---|---|
| Each run | +1 |
| Each wicket (min 1 over) | +20 |
| Catch | +10 |
| Run out (primary fielder) | +10 |
| Run out (helper) | +5 |
| Stumping | +10 |

### Batting bonuses (tiered — highest only)
| Milestone | Bonus |
|---|---|
| 30+ runs | +10 |
| 50+ runs | +20 |
| 100+ runs | +40 |

### Strike-rate bonus (stacks with milestone)
- 25+ runs AND SR ≥ 135 → `+round(5 * SR / 135)`

### Bowling bonuses
| Condition | Bonus |
|---|---|
| Economy < 4 + ≥ 1 wicket + ≥ 1 over | +10 |
| 0 wickets + ≥ 2 overs + economy < 6 | `+round((6 − economy) × 5)` (tight-spell) |
| 3-wicket haul | +20 |
| 5-wicket haul | +40 (replaces 3W) |

### Awards / availability
- POTM (manual): +30
- Season MVP: +50
- Available but not picked in Playing 12: +10

---

## Database schema (current state)

10 tables. Schema files under `mvcc-app/supabase/migrations/` are the source of truth.

```
tournaments         (id, name, short_name, format, year, status, team_pin)
players             (id, name, short_name, team, jersey_number, cc_player_id, is_external)
matches             (id, tournament_id, match_number, date, time, opponent,
                     opponent_short, ground, is_played, result, mvcc_score,
                     opponent_score, potm_player_id, playing_12 int[])
performances        (id, match_id, player_id,
                     runs, balls_faced, fours, sixes,
                     how_out, fielder, bowler_name,
                     overs_bowled, runs_conceded, wickets, maidens,
                     wides, no_balls, dot_balls,
                     catches, runout_fielder, runout_helper, stumpings,
                     batting_points, bowling_points, fielding_points,
                     bonus_points, availability_points, total_points,
                     is_potm)
opponent_batting    (id, match_id, player_name, runs, balls, fours, sixes,
                     how_out, fielder, bowler_name)
opponent_bowling    (id, match_id, player_name, overs, maidens, runs_conceded,
                     wickets, wides, no_balls, dot_balls)
availability        (id, tournament_id, match_id, player_id, status, note, submitted_at)
                     UNIQUE (match_id, player_id)
fall_of_wickets     (id, match_id, innings, wicket_number, score, over_number, batsman_name)
match_extras        (id, match_id, innings, byes, leg_byes, wides, no_balls,
                     penalty, total_extras)
                     UNIQUE (match_id, innings)
```

All tables: RLS enabled, public SELECT, permissive write (admin gating enforced at app layer).

---

## Migrations applied

```
002_availability_external.sql  — availability table, players.is_external,
                                  performances.availability_points,
                                  matches.playing_12
003_tournaments.sql            — tournaments table, matches.tournament_id,
                                  T30 + T20 seeded
004_scorecard_dismissals_fow_extras.sql
                               — performances dismissal cols + extras cols,
                                  opponent_batting fielder/bowler,
                                  opponent_bowling wides/no_balls/dot_balls,
                                  fall_of_wickets, match_extras tables
```

Migration 001 was the initial bootstrap and is not in the repo — schema was created in the Supabase dashboard before migrations were tracked.

---

## Season 2026 schedule

| # | Date | Time | Opponent | Ground |
|---|---|---|---|---|
| 1 | May 16 | 9:00 AM | Michigan Rangers CC | Belle-Isle |
| 2 | May 30 | 2:30 PM | Michigan International CA Chargers | Lyon Oaks |
| 3 | Jun 6 | 9:00 AM | Michigan Warriors | Canton |
| 4 | Jun 13 | 9:00 AM | Detroit Super Kings CC Bulls | Canton |
| 5 | Jun 27 | 9:00 AM | Majestic Lions CC | Jayne |
| 6 | Jul 11 | 2:30 PM | The Squad Cricket Club | Sterling Heights |
| 7 | Jul 18 | 9:00 AM | Royal Bengals CC | Lyon Oaks |
| 8 | Jul 25 | 9:00 AM | Motown CC | Sterling Heights |

---

## Route map

```
/                              Multi-tournament dashboard (homepage)
/t30                           T30 leaderboard
/t30/schedule                  Schedule with POTM + countdown
/t30/rules                     Points rules + FAQ
/t30/availability              PIN-gated 5-step form
/t30/admin                     Admin panel (Scorecard + Availability tabs)
/t30/player/[slug]             Per-player profile + recharts graph
/schedule, /rules, /admin,
/availability                  Stub routes that redirect to /t30/<route>
/auth/callback                 Supabase Google OAuth callback
/manifest.webmanifest          Auto-generated PWA manifest
/opengraph-image               Auto-generated OG card (1200×630)
/twitter-image                 Twitter card (same render as OG)
```

---

## File structure

```
mvcc-app/
├── app/
│   ├── layout.tsx              Root layout, metadata, viewport, OG/Twitter, PWA
│   ├── manifest.ts             PWA manifest (Next 15 convention)
│   ├── opengraph-image.tsx     Default OG image (text-only, satori-safe)
│   ├── twitter-image.tsx       Re-exports opengraph-image
│   ├── loading.tsx             Global route-level loading skeleton
│   ├── page.tsx                Multi-tournament dashboard
│   ├── globals.css             CSS variables + global styles + keyframes
│   ├── admin/page.tsx          Redirect → /t30/admin
│   ├── schedule/page.tsx       Redirect → /t30/schedule
│   ├── rules/page.tsx          Redirect → /t30/rules
│   ├── availability/page.tsx   Redirect → /t30/availability
│   ├── auth/callback/route.ts  OAuth callback handler
│   └── t30/
│       ├── page.tsx            Leaderboard with streak indicators
│       ├── schedule/page.tsx   Match schedule
│       ├── rules/page.tsx      Rules page
│       ├── availability/page.tsx  PIN-gated availability form
│       ├── admin/page.tsx      Admin panel (Scorecard + Availability tabs)
│       └── player/[slug]/
│           ├── page.tsx        Player profile
│           ├── PointsChart.tsx Lazy-imported recharts chart
│           └── not-found.tsx   404 for unknown slugs
├── components/
│   ├── Nav.tsx                 Desktop nav with layoutId active indicator
│   ├── MobileNav.tsx           Mobile bottom nav (4 tabs + admin if logged in)
│   ├── TeamBanner.tsx          MM vs HB banner with count-up + progress bar
│   ├── PlayerModal.tsx         Player quick-view drawer (sticky header, scroll body)
│   ├── ScorecardModal.tsx      Cricbuzz-style match scorecard, 3 tabs
│   ├── ScheduleCard.tsx        Match card with POTM + countdown chips
│   ├── BackgroundCanvas.tsx    Animated particle/aurora background
│   └── HorseWatermark.tsx      Mavericks horse breathing watermark
├── lib/
│   ├── supabase.ts             Client + types + fetchTournament() memoized helper
│   ├── points.ts               Points calculation engine (all bonuses)
│   ├── parseCSV.ts             CricClub CSV parser + formatDismissal()
│   └── playerImages.ts         short_name → photo filename map
├── public/
│   ├── mavericks-logo.jpeg     Club logo (also used as watermark + favicon)
│   ├── players/                22 player photo JPEGs
│   └── logos/opponents/        8 opponent team logos (unused after the
│                                Instagram card feature was dropped — leftover)
└── supabase/migrations/
    ├── 002_availability_external.sql
    ├── 003_tournaments.sql
    └── 004_scorecard_dismissals_fow_extras.sql
```

---

## Admin workflow (CSV → leaderboard)

1. Go to `/t30/admin`, sign in with Google (must be in ADMIN_EMAILS).
2. **Scorecard tab** → select a match.
3. Drop the CricClub CSV. Parser extracts ALL stats (MVCC + opponent batting/bowling, dismissals, fall of wickets, extras).
4. Preview shows MVCC players parsed, opponent stats, extras totals, FOW chips.
5. Toggle EXT for any external player, toggle POTM for the man of the match.
6. Confirm match result + scores (auto-filled but editable).
7. **SAVE SCORECARD** → writes to performances, opponent_batting, opponent_bowling, fall_of_wickets, match_extras. Errors surface as a red toast.
8. **Availability tab** → pick a match, view all 22 responses, select Playing 12. On save, available-but-benched players auto-get +10 availability points.

---

## Common gotchas

- **Next.js + Windows EXDEV error on `npm run dev`/`build`**: a known Next 15 telemetry config bug, harmless. Run `npx next telemetry disable` once to suppress. Vercel builds are unaffected.
- **Satori (`next/og`) is strict**: every multi-child element needs `display: flex`, no text+span mixing, no fancy CSS, no edge-runtime self-fetches for images. Keep OG renders text-only and trivial.
- **Migration order matters**: running code that references a column that doesn't exist yet produces empty inserts (Postgres rejects, supabase-js doesn't throw without error-checking — that's why `handleSave` now uses a `check()` helper to surface every step's error).
- **Player short names with non-ASCII or punctuation**: Gani's full name `(gani)siva Ganesh Asodi` has parentheses. The CSV parser normalizes via `findShortName()` lookup. Don't trust raw CSV names directly.
- **Edge runtime fetches**: an Edge function can't always reliably fetch a URL on the same deployment (self-loop / cold caches). Inline data or use placeholders for OG images.

---

## Possible next features

(See README for the public-facing version. Internal notes:)

- **Match predictions**: simple pre-match form, locks at toss time. Pure additive feature, new table `predictions`.
- **Head-to-head player compare**: client-side only, reuses existing leaderboard data.
- **Season awards page**: derived from existing performances, no new tables.
- **Records board**: same — pure SQL aggregations.
- **Partnership analyzer**: derived from `fall_of_wickets` (consecutive wickets define a partnership span).
- **Per-match dynamic OG image**: revisit `next/og` with the lessons from the dropped Instagram card attempt. Text-only safe, no edge-runtime image fetches.
- **T20 activation**: when ready, set tournaments.status to 'active' and add matches via the dashboard.

---

*Last updated: 2026 mid-season. Keep this file in sync when schema or rules change.*
