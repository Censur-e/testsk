-- Skydrive Panel — schema initial
-- Single-game setup : une seule ligne dans world_state / server_state.

-- =========================================
-- TRIGGERS (Règles Si / Alors)
-- =========================================
create table if not exists public.triggers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  condition_type text not null,
  condition_value text not null default '',
  action_type text not null,
  action_value text not null default '',
  enabled boolean not null default true,
  matches integer not null default 0,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists triggers_enabled_idx on public.triggers (enabled);

-- =========================================
-- BANS (Joueurs bannis, persistant)
-- =========================================
create table if not exists public.bans (
  id uuid primary key default gen_random_uuid(),
  user_id bigint,
  player_name text not null,
  reason text not null default '',
  banned_by text not null default 'Admin',
  permanent boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bans_user_id_idx on public.bans (user_id);

-- =========================================
-- ECONOMY (Solde persistant par joueur)
-- =========================================
create table if not exists public.economy (
  user_id bigint primary key,
  player_name text not null,
  money integer not null default 0,
  bank integer not null default 0,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Transactions pour audit / graphique
create table if not exists public.economy_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id bigint,
  player_name text not null,
  delta integer not null,
  kind text not null, -- 'earn' | 'spend' | 'transfer' | 'admin'
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists economy_tx_created_idx
  on public.economy_transactions (created_at desc);

-- =========================================
-- LOGS (Console globale : chat, errors, exec)
-- =========================================
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info', -- info | success | error | warning | chat | exec
  source text not null default 'system',
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists logs_created_idx on public.logs (created_at desc);

-- =========================================
-- WORLD STATE (Une seule ligne id=1)
-- =========================================
create table if not exists public.world_state (
  id integer primary key default 1,
  gravity real not null default 196.2,
  jump_power real not null default 50,
  walk_speed real not null default 16,
  time_of_day real not null default 14.0,
  weather text not null default 'clear', -- clear | rain | snow | fog | storm | sunset
  pvp_enabled boolean not null default true,
  fog_enabled boolean not null default false,
  day_night_cycle boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint world_state_singleton check (id = 1)
);

insert into public.world_state (id) values (1) on conflict do nothing;

-- =========================================
-- SERVER STATE (Une seule ligne id=1, heartbeat Roblox)
-- =========================================
create table if not exists public.server_state (
  id integer primary key default 1,
  online boolean not null default false,
  job_id text,
  place_id bigint,
  player_count integer not null default 0,
  max_players integer not null default 30,
  avg_ping integer not null default 0,
  uptime_seconds integer not null default 0,
  last_heartbeat timestamptz,
  updated_at timestamptz not null default now(),
  constraint server_state_singleton check (id = 1)
);

insert into public.server_state (id) values (1) on conflict do nothing;

-- =========================================
-- LIVE PLAYERS (Snapshot joueurs en ligne)
-- =========================================
create table if not exists public.live_players (
  user_id bigint primary key,
  name text not null,
  display_name text,
  role text not null default 'Joueur',
  health real not null default 100,
  max_health real not null default 100,
  armor real not null default 0,
  ping integer not null default 0,
  team text,
  position_x real not null default 0,
  position_y real not null default 0,
  position_z real not null default 0,
  kills integer not null default 0,
  deaths integer not null default 0,
  inventory jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================
-- COMMAND QUEUE (Commandes envoyées à Roblox)
-- =========================================
create table if not exists public.command_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- kick, ban, warn, mute, freeze, heal, kill, teleport, set_world, execute, etc.
  target_user_id bigint,
  target_name text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending | delivered | done | failed
  error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  executed_at timestamptz
);

create index if not exists cmd_status_idx on public.command_queue (status, created_at);
