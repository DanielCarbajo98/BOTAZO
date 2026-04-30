-- Audiobet — migration 002
-- Adds tables for individual player statistics gathered from FBref/Understat.
-- Run this once in your Supabase SQL editor before scrapers populate it.

create table if not exists players (
    id uuid primary key default gen_random_uuid(),
    fbref_id text unique,
    understat_id text,
    name text not null,
    team_api_id integer,
    position text,
    age integer,
    market_value_eur numeric,
    last_updated timestamptz default now()
);

create index if not exists idx_players_team on players(team_api_id);
create index if not exists idx_players_name on players(lower(name));

create table if not exists player_match_stats (
    id uuid primary key default gen_random_uuid(),
    player_id uuid references players(id) on delete cascade,
    fixture_api_id integer,
    minutes integer,
    goals integer,
    assists integer,
    shots integer,
    shots_on_target integer,
    xg numeric,
    xa numeric,
    yellow_cards integer,
    red_cards integer,
    fouls_committed integer,
    fetched_at timestamptz default now(),
    unique (player_id, fixture_api_id)
);

create index if not exists idx_player_match_player on player_match_stats(player_id);
create index if not exists idx_player_match_fixture on player_match_stats(fixture_api_id);
