-- Setup tables pour le panel admin Roblox Skydrive
-- Exécuter ce script dans Supabase

-- 1. Table des utilisateurs du panel (authentification)
CREATE TABLE IF NOT EXISTS panel_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'mod', 'viewer'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des joueurs Roblox
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY, -- userId Roblox
  username TEXT NOT NULL,
  avatar_url TEXT,
  health INTEGER DEFAULT 100,
  armor INTEGER DEFAULT 0,
  ping INTEGER DEFAULT 0,
  role TEXT DEFAULT 'Joueur', -- 'Admin', 'Mod', 'VIP', 'Joueur'
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  position_z FLOAT DEFAULT 0,
  money BIGINT DEFAULT 0,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  playtime_minutes INTEGER DEFAULT 0,
  team TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des bans
CREATE TABLE IF NOT EXISTS bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES players(id),
  username TEXT NOT NULL,
  reason TEXT NOT NULL,
  banned_by TEXT NOT NULL,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des commandes exécutées
CREATE TABLE IF NOT EXISTS commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL, -- 'kick', 'ban', 'heal', etc.
  target_id TEXT, -- userId Roblox ou NULL
  payload JSONB, -- données supplémentaires
  issued_by TEXT NOT NULL, -- qui a exécuté la commande
  status TEXT DEFAULT 'pending', -- 'pending', 'acked', 'failed'
  error_message TEXT,
  acked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des triggers/automatisations
CREATE TABLE IF NOT EXISTS triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  icon TEXT DEFAULT 'zap', -- 'wifi', 'message-square', 'shield', etc.
  is_enabled BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des logs/messages console
CREATE TABLE IF NOT EXISTS console_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'info', 'success', 'error', 'warning', 'chat'
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Table de l'économie des joueurs
CREATE TABLE IF NOT EXISTS economy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES players(id),
  username TEXT NOT NULL,
  balance BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Table de l'état du monde/serveur
CREATE TABLE IF NOT EXISTS world_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL UNIQUE,
  gravity FLOAT DEFAULT 196.2,
  jump_height FLOAT DEFAULT 7.2,
  walk_speed FLOAT DEFAULT 16,
  time_of_day FLOAT DEFAULT 12,
  auto_cycle BOOLEAN DEFAULT true,
  weather TEXT DEFAULT 'clear', -- 'clear', 'rain', 'snow', 'fog', 'storm'
  pvp_enabled BOOLEAN DEFAULT true,
  friendly_fire BOOLEAN DEFAULT false,
  server_locked BOOLEAN DEFAULT false,
  map_closed BOOLEAN DEFAULT false,
  maintenance_mode BOOLEAN DEFAULT false,
  fall_damage BOOLEAN DEFAULT true,
  slow_motion FLOAT DEFAULT 1.0,
  max_players INTEGER DEFAULT 20,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Table des statistiques du serveur
CREATE TABLE IF NOT EXISTS server_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  uptime_seconds INTEGER DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 20,
  avg_ping INTEGER DEFAULT 0,
  cpu_usage FLOAT DEFAULT 0,
  memory_mb INTEGER DEFAULT 0,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Table des avertissements (warns)
CREATE TABLE IF NOT EXISTS player_warns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES players(id),
  reason TEXT NOT NULL,
  warned_by TEXT NOT NULL,
  warn_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Créer les indexes pour les performances
CREATE INDEX idx_players_online ON players(is_online);
CREATE INDEX idx_players_team ON players(team);
CREATE INDEX idx_bans_user_id ON bans(user_id);
CREATE INDEX idx_bans_active ON bans(is_active);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_created ON commands(created_at);
CREATE INDEX idx_console_logs_created ON console_logs(created_at);
CREATE INDEX idx_economy_user_id ON economy(user_id);
CREATE INDEX idx_world_state_server ON world_state(server_id);
CREATE INDEX idx_server_stats_server ON server_stats(server_id);
CREATE INDEX idx_warns_user_id ON player_warns(user_id);

-- Activer RLS (Row Level Security) pour la sécurité
ALTER TABLE panel_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE console_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE economy ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_warns ENABLE ROW LEVEL SECURITY;

-- Politique RLS simple : tout le monde peut lire, seuls les admins peuvent modifier
-- À affiner selon vos besoins de sécurité

CREATE POLICY "Allow all reads" ON panel_users FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON players FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON bans FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON commands FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON triggers FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON console_logs FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON economy FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON world_state FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON server_stats FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON player_warns FOR SELECT USING (true);
