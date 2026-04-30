-- Audiobet — migration 001 (initial schema)
-- Run this in your Supabase SQL Editor BEFORE the bot tries to upsert anything.
-- Idempotent: uses `if not exists` so re-running is safe.

create table if not exists teams (
    id uuid primary key default gen_random_uuid(),
    api_id integer unique not null,
    name text not null,
    short_name text,
    country text,
    league_id integer,
    league_name text,
    logo_url text,
    elo_rating numeric,
    last_updated timestamptz default now()
);
create index if not exists idx_teams_league on teams(league_id);
create index if not exists idx_teams_name on teams(lower(name));

create table if not exists fixtures (
    id uuid primary key default gen_random_uuid(),
    api_id integer unique not null,
    date timestamptz not null,
    league_id integer,
    league_name text,
    season text,
    home_team_api_id integer,
    away_team_api_id integer,
    home_team_name text,
    away_team_name text,
    status text,
    score_home integer,
    score_away integer,
    venue text,
    referee text,
    last_updated timestamptz default now()
);
create index if not exists idx_fixtures_date on fixtures(date);
create index if not exists idx_fixtures_home on fixtures(home_team_api_id);
create index if not exists idx_fixtures_away on fixtures(away_team_api_id);
create index if not exists idx_fixtures_league on fixtures(league_id);

create table if not exists fixture_stats (
    id uuid primary key default gen_random_uuid(),
    fixture_api_id integer unique not null,
    possession_home numeric,
    possession_away numeric,
    shots_home integer,
    shots_away integer,
    shots_on_target_home integer,
    shots_on_target_away integer,
    corners_home integer,
    corners_away integer,
    yellow_home integer,
    yellow_away integer,
    red_home integer,
    red_away integer,
    xg_home numeric,
    xg_away numeric,
    fetched_at timestamptz default now()
);
create index if not exists idx_fixture_stats_fixture on fixture_stats(fixture_api_id);

create table if not exists injuries (
    id uuid primary key default gen_random_uuid(),
    player_api_id integer,
    player_name text,
    team_api_id integer,
    fixture_api_id integer,
    reason text,
    type text,
    fetched_at timestamptz default now()
);
create index if not exists idx_injuries_team on injuries(team_api_id);
create index if not exists idx_injuries_fixture on injuries(fixture_api_id);

create table if not exists odds_snapshots (
    id uuid primary key default gen_random_uuid(),
    fixture_api_id integer not null,
    bookmaker text,
    market text,
    outcome text,
    odds numeric,
    fetched_at timestamptz default now()
);
create index if not exists idx_odds_fixture on odds_snapshots(fixture_api_id);
create index if not exists idx_odds_market on odds_snapshots(market);

create table if not exists predictions (
    id uuid primary key default gen_random_uuid(),
    fixture_api_id integer not null,
    match_label text,
    market text,
    outcome text,
    model_probability numeric,
    market_odds numeric,
    implied_probability numeric,
    edge numeric,
    expected_value numeric,
    recommended_stake_pct numeric,
    confidence text,
    reasoning text,
    created_at timestamptz default now(),
    resolved boolean default false,
    result text,
    pnl_units numeric
);
create index if not exists idx_predictions_fixture on predictions(fixture_api_id);
create index if not exists idx_predictions_resolved on predictions(resolved);

create table if not exists daily_reports (
    id uuid primary key default gen_random_uuid(),
    report_date date unique not null,
    fixtures_analyzed integer default 0,
    picks_published integer default 0,
    total_picks integer default 0,
    won integer default 0,
    lost integer default 0,
    void_count integer default 0,
    roi numeric,
    telegram_sent boolean default false,
    created_at timestamptz default now()
);

create table if not exists bot_config (
    key text primary key,
    value text,
    updated_at timestamptz default now()
);
