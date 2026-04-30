-- Audiobet — migration 003 (tennis)
-- Creates the tables Phase 6 needs to host tennis: players (with Elo per
-- surface), matches, and ratings history. Idempotent.

create table if not exists tennis_players (
    id uuid primary key default gen_random_uuid(),
    api_id integer unique not null,         -- our hashed id
    sackmann_id text unique,                -- atp/wta integer id from Jeff Sackmann's CSVs
    tour text not null,                     -- 'ATP' or 'WTA'
    name text not null,
    country text,
    hand text,                              -- 'R' / 'L' / 'U'
    height_cm integer,
    birth_date date,
    elo numeric default 1500,
    elo_clay numeric default 1500,
    elo_hard numeric default 1500,
    elo_grass numeric default 1500,
    matches_played integer default 0,
    last_updated timestamptz default now()
);

create index if not exists idx_tennis_players_name on tennis_players (lower(name));
create index if not exists idx_tennis_players_tour on tennis_players (tour);

create table if not exists tennis_matches (
    id uuid primary key default gen_random_uuid(),
    api_id integer unique not null,         -- hashed from date+player1+player2
    date timestamptz not null,
    tour text not null,                     -- 'ATP' / 'WTA'
    tournament text,
    surface text,                           -- 'Clay' / 'Hard' / 'Grass' / 'Carpet'
    round text,
    player1_api_id integer,
    player2_api_id integer,
    player1_name text,
    player2_name text,
    winner_api_id integer,
    score text,
    status text,                            -- 'scheduled' / 'finished'
    last_updated timestamptz default now()
);

create index if not exists idx_tennis_matches_date on tennis_matches (date);
create index if not exists idx_tennis_matches_p1 on tennis_matches (player1_api_id);
create index if not exists idx_tennis_matches_p2 on tennis_matches (player2_api_id);

create table if not exists tennis_player_ratings_history (
    id uuid primary key default gen_random_uuid(),
    player_api_id integer not null,
    snapshot_date date not null,
    elo numeric,
    elo_clay numeric,
    elo_hard numeric,
    elo_grass numeric,
    matches_played integer,
    unique (player_api_id, snapshot_date)
);

alter table tennis_players disable row level security;
alter table tennis_matches disable row level security;
alter table tennis_player_ratings_history disable row level security;
