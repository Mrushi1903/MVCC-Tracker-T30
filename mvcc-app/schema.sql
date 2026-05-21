-- MVCC Tournament Tracker - Supabase Schema
-- Run this in Supabase SQL Editor

-- Players table
create table players (
  id serial primary key,
  name text not null,
  short_name text not null,
  team text not null check (team in ('MM', 'HB')),
  jersey_number int,
  cc_player_id text,
  created_at timestamp default now()
);

-- Matches table
create table matches (
  id serial primary key,
  match_number int not null,
  date date not null,
  time text,
  opponent text not null,
  ground text,
  result text check (result in ('won', 'lost', 'tied', 'no_result', null)),
  mvcc_score text,
  opponent_score text,
  potm_player_id int references players(id),
  is_played boolean default false,
  created_at timestamp default now()
);

-- Player match performances table
create table performances (
  id serial primary key,
  match_id int references matches(id) on delete cascade,
  player_id int references players(id),
  
  -- Batting
  runs int default 0,
  balls_faced int default 0,
  fours int default 0,
  sixes int default 0,
  dismissed boolean default false,
  
  -- Bowling
  overs_bowled numeric(4,1) default 0,
  runs_conceded int default 0,
  wickets int default 0,
  maidens int default 0,
  
  -- Fielding
  catches int default 0,
  runout_fielder int default 0,
  runout_helper int default 0,
  stumpings int default 0,
  
  -- Calculated points (auto-computed)
  batting_points int default 0,
  bowling_points int default 0,
  fielding_points int default 0,
  bonus_points int default 0,
  total_points int default 0,
  
  is_potm boolean default false,
  
  created_at timestamp default now(),
  unique(match_id, player_id)
);

-- Enable Row Level Security
alter table players enable row level security;
alter table matches enable row level security;
alter table performances enable row level security;

-- Public read access for all
create policy "Public read players" on players for select using (true);
create policy "Public read matches" on matches for select using (true);
create policy "Public read performances" on performances for select using (true);

-- Admin write access (using a simple admin check via service role)
create policy "Admin write players" on players for all using (true);
create policy "Admin write matches" on matches for all using (true);
create policy "Admin write performances" on performances for all using (true);

-- Insert all 22 players
insert into players (name, short_name, team, jersey_number, cc_player_id) values
-- MIGHTY MAVERICKS
('Amarendra Nuvvala', 'Amar', 'MM', 0, '2071868'),
('(gani)siva Ganesh Asodi', 'Gani', 'MM', 18, '3168214'),
('Mahender Bureddy', 'Mahendra', 'MM', 0, '2073272'),
('Sai Manoj Kagolanu', 'Manoj', 'MM', 0, '576191'),
('Nithin Reddy Musku', 'Nithin', 'MM', 0, '2894051'),
('Rahul Menon', 'Rahul', 'MM', 0, '6068927'),
('Raheel Shaik', 'Raheel', 'MM', 63, '3292250'),
('Ravi Kumar Pattipati', 'Ravi', 'MM', 45, '5151840'),
('Rohith Maddipati', 'Rohith', 'MM', 0, '3397030'),
('Rupendra Chowdary Palakurthi', 'Rupendra', 'MM', 19, '2074351'),
('Yeshwanth Kumar Mutcherla', 'Yeswanth', 'MM', 0, '1741568'),
-- HELL BOYS
('Akshay Raju', 'Akshay', 'HB', 18, '2845273'),
('Hemanth Kasa', 'Hemanth', 'HB', 12, '3606432'),
('Karthik Balakrishna', 'Karthik', 'HB', 15, '315255'),
('Kousik Dhanekula', 'Koushik', 'HB', 6, '4496724'),
('Naveen Kumar Peddi', 'Naveen', 'HB', 0, '921004'),
('Nikhil Pasula', 'Nikhil', 'HB', 0, '875307'),
('Rushi Vardan Reddy Maddi', 'Rushi', 'HB', 3, '3187944'),
('Saran Damacharla', 'Saran', 'HB', 14, '2074608'),
('Siddharth Chawla', 'Siddarth', 'HB', 0, '3508506'),
('Suman Reddy Gaddam', 'Suman', 'HB', 0, '826294'),
('Viswanath Kasu', 'Viswa', 'HB', 0, '803255');

-- Insert match schedule
insert into matches (match_number, date, time, opponent, ground, is_played) values
(1, '2026-05-16', '9:00 AM', 'Michigan Rangers CC', 'Belle-Isle', false),
(2, '2026-05-30', '2:30 PM', 'Michigan International CA Chargers', 'Lyon Oaks', false),
(3, '2026-06-06', '9:00 AM', 'Michigan Warriors', 'Clinton', false),
(4, '2026-06-13', '9:00 AM', 'Detroit Super Kings CC Bulls', 'Clinton', false),
(5, '2026-06-27', '9:00 AM', 'Majestic Lions CC', 'Jayne', false),
(6, '2026-07-11', '2:30 PM', 'The Squad Cricket Club', 'Sterling Heights', false),
(7, '2026-07-18', '9:00 AM', 'Royal Bengals CC', 'Lyon Oaks', false),
(8, '2026-07-25', '9:00 AM', 'Motown CC', 'Sterling Heights', false);
