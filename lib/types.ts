// Types partagés entre le panel et l'API (cote serveur Roblox)
// Aucune donnee codee en dur ici - juste les structures

export type PlayerRole = "Admin" | "Mod" | "VIP" | "Joueur"

export type Player = {
  id: string // userId Roblox (string pour uniformiser)
  username: string
  avatar: string
  health: number
  armor: number
  ping: number
  role: PlayerRole
  position: { x: number; y: number; z: number }
  money: number
  kills: number
  deaths: number
  playtime: string
  team: string
  items: string[]
  lastSeen: number // timestamp ms - pour detecter les joueurs offline
}

export type TriggerIcon =
  | "wifi"
  | "message-square"
  | "shield"
  | "moon"
  | "mic"
  | "gift"
  | "zap"
  | "alert-triangle"

export type Trigger = {
  id: string
  name: string
  condition: string
  action: string
  enabled: boolean
  triggered: number
  icon: TriggerIcon
  createdAt: number
}

export type ConsoleMessage = {
  id: string
  type: "info" | "success" | "error" | "warning" | "chat"
  text: string
  time: string
  createdAt: number
}

// Commandes envoyees du panel vers Roblox
export type CommandKind =
  | "kick"
  | "ban"
  | "unban"
  | "warn"
  | "mute"
  | "unmute"
  | "freeze"
  | "unfreeze"
  | "spectate"
  | "heal"
  | "kill"
  | "teleport_to_me"
  | "teleport"
  | "force_chat"
  | "wipe_inventory"
  | "clone"
  | "set_team"
  | "set_money"
  | "execute_lua"
  | "set_world"
  | "broadcast"

export type Command = {
  id: string
  kind: CommandKind
  targetId?: string // userId Roblox de la cible, ou "*" pour tous
  payload?: Record<string, unknown> // parametres specifiques (raison, duree, code lua, etc.)
  createdAt: number
  status: "pending" | "acked" | "failed"
  ackedAt?: number
  error?: string
  issuedBy?: string // qui a envoye la commande depuis le panel
}

export type WorldState = {
  gravity: number // studs/s^2 (defaut 196.2)
  jumpHeight: number // studs
  walkSpeed: number // studs/s
  timeOfDay: number // 0-24
  autoCycle: boolean
  weather: "clear" | "rain" | "snow" | "fog" | "storm"
  pvpEnabled: boolean
  friendlyFire: boolean
}

export type BanRecord = {
  userId: string
  username: string
  reason: string
  bannedBy: string
  bannedAt: number
  expiresAt?: number // null = permanent
}

export type EconomyEntry = {
  userId: string
  username: string
  balance: number
  totalEarned: number
  totalSpent: number
  updatedAt: number
}

export type ServerStats = {
  serverId: string
  jobId: string
  placeId: string
  uptime: number
  playerCount: number
  maxPlayers: number
  avgPing: number
  cpuUsage: number
  memoryMB: number
  lastHeartbeat: number
}
