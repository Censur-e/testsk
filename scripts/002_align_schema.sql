-- =========================================================================
-- Skydrive Panel - migration d'alignement du schema
-- =========================================================================
-- Le fichier 001 utilisait des noms de colonnes differents de ceux attendus
-- par lib/store.ts (ex: `player_name` vs `username`, `message` vs `text`,
-- `money` vs `balance`, `type` vs `kind`, ...). On supprime et recree les
-- tables pour qu'elles correspondent exactement au code.
--
-- On ajoute aussi de nouveaux champs a world_state pour les nouvelles
-- options (fermeture de map, verrouillage du serveur, mode maintenance,
-- max de joueurs, slow motion, degats de chute).
-- =========================================================================

drop table if exists public.live_players cascade;
drop table if exists public.command_queue cascade;
drop table if exists public.logs cascade;
drop table if exists public.bans cascade;
drop table if exists public.economy_transactions cascade;
drop table if exists public.economy cascade;
drop table if exists public.triggers cascade;
drop table if exists public.world_state cascade;
drop table if exists public.server_state cascade;

-- =========================================
-- LIVE PLAYERS (snapshot temps reel)
-- =========================================
create table public.live_players (
  id text primary key,
  username text not null,
  avatar text not null default '',
  health integer not null default 100,
  armor integer not null default 0,
  ping integer not null default 0,
  role text not null default 'Joueur',
  position_x real not null default 0,
  position_y real not null default 0,
  position_z real not null default 0,
  money integer not null default 0,
  kills integer not null default 0,
  deaths integer not null default 0,
  playtime text not null default '0m',
  team text not null default '',
  items jsonb not null default '[]'::jsonb,
  last_seen timestamptz not null default now()
);

-- =========================================
-- TRIGGERS (regles Si / Alors)
-- =========================================
create table public.triggers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  condition text not null default '',
  action text not null default '',
  enabled boolean not null default true,
  triggered integer not null default 0,
  icon text not null default 'zap',
  created_at timestamptz not null default now()
);

create index triggers_enabled_idx on public.triggers (enabled);

-- =========================================
-- LOGS (console globale)
-- =========================================
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info', -- info | success | error | warning | chat
  text text not null,
  created_at timestamptz not null default now()
);

create index logs_created_idx on public.logs (created_at desc);

-- =========================================
-- COMMAND QUEUE (panel -> jeu)
-- =========================================
create table public.command_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending | acked | failed
  acked_at timestamptz,
  error text,
  issued_by text,
  created_at timestamptz not null default now()
);

create index cmd_status_idx on public.command_queue (status, created_at);

-- =========================================
-- WORLD STATE (singleton id=1)
-- =========================================
create table public.world_state (
  id integer primary key default 1,
  gravity real not null default 196.2,
  jump_height real not null default 7.2,
  walk_speed real not null default 16,
  time_of_day real not null default 14.0,
  auto_cycle boolean not null default true,
  weather text not null default 'clear',
  pvp_enabled boolean not null default true,
  friendly_fire boolean not null default false,
  -- nouvelles options de controle serveur
  server_locked boolean not null default false,
  map_closed boolean not null default false,
  maintenance_mode boolean not null default false,
  fall_damage boolean not null default true,
  slow_motion real not null default 1.0,
  max_players integer not null default 30,
  updated_at timestamptz not null default now(),
  constraint world_state_singleton check (id = 1)
);

insert into public.world_state (id) values (1) on conflict do nothing;

-- =========================================
-- SERVER STATE (singleton id=1)
-- =========================================
create table public.server_state (
  id integer primary key default 1,
  server_id text not null default 'unknown',
  job_id text not null default 'unknown',
  place_id text not null default 'unknown',
  uptime integer not null default 0,
  player_count integer not null default 0,
  max_players integer not null default 30,
  avg_ping integer not null default 0,
  cpu_usage real not null default 0,
  memory_mb real not null default 0,
  last_heartbeat timestamptz,
  updated_at timestamptz not null default now(),
  constraint server_state_singleton check (id = 1)
);

insert into public.server_state (id) values (1) on conflict do nothing;

-- =========================================
-- BANS (persistant)
-- =========================================
create table public.bans (
  user_id text primary key,
  username text not null,
  reason text not null default '',
  banned_by text not null default 'Admin',
  banned_at timestamptz not null default now(),
  expires_at timestamptz
);

-- =========================================
-- ECONOMY (solde persistant)
-- =========================================
create table public.economy (
  user_id text primary key,
  username text not null,
  balance integer not null default 0,
  total_earned integer not null default 0,
  total_spent integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.economy_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  username text not null,
  delta integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create index economy_tx_created_idx
  on public.economy_transactions (created_at desc);
