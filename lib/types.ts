// Types partages entre le panel et l'API (cote serveur Roblox)
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

// Commandes envoyees du panel vers Roblox.
// Aucune reference a spectate/weather (retires du panel).
export type CommandKind =
  // Moderation joueur
  | "kick"
  | "ban"
  | "unban"
  | "warn"
  | "mute"
  | "unmute"
  | "freeze"
  | "unfreeze"
  // Etat du joueur
  | "heal"
  | "kill"
  | "set_health"
  | "remove_armor"
  | "set_armor"
  | "reset_character"
  | "refill_ammo"
  | "set_walkspeed"
  | "set_jumpheight"
  // Mouvement / teleport
  | "teleport_to_me"
  | "teleport"
  | "teleport_to_player"
  | "bring_all"
  // Inventaire
  | "wipe_inventory"
  | "give_item"
  | "remove_item"
  // Social / communication
  | "force_chat"
  | "clone"
  | "set_team"
  | "set_role"
  | "set_money"
  | "give_money"
  | "execute_lua"
  | "announce"
  | "private_message"
  // Monde / serveur
  | "set_world"
  | "broadcast"
  | "close_map"
  | "open_map"
  | "lock_server"
  | "unlock_server"
  | "maintenance_on"
  | "maintenance_off"
  | "kick_all"
  | "server_shutdown"
  | "server_restart"
  // Commande personnalisee (definie dans les parametres)
  | "custom"

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
  // weather reste stocke pour compatibilite, mais n'est plus edite depuis le panel
  weather: "clear" | "rain" | "snow" | "fog" | "storm"
  pvpEnabled: boolean
  friendlyFire: boolean
  // --- Nouveaux controles serveur ---
  serverLocked: boolean // bloque les nouvelles connexions
  mapClosed: boolean // restreint les joueurs dans un spawn / lobby
  maintenanceMode: boolean // seuls les Admins peuvent jouer
  fallDamage: boolean // degats de chute
  slowMotion: number // multiplicateur de vitesse du monde (1 = normal)
  maxPlayers: number // nombre max de joueurs simultanes
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

// ============ COMMANDES PERSONNALISEES (parametres) ============

export type CustomCommandInputType = "text" | "textarea" | "number" | "select" | "boolean"

export type CustomCommandInput = {
  key: string // identifiant unique (accessible dans le Lua via inputs.nomCle)
  label: string // libelle affiche dans le formulaire
  type: CustomCommandInputType
  placeholder?: string
  defaultValue?: string
  required?: boolean
  min?: number
  max?: number
  options?: { value: string; label: string }[] // pour type "select"
  hint?: string
}

export type CustomCommandCategory = "player" | "world"

export type CustomCommand = {
  id: string
  name: string
  description: string
  icon: string // nom d'une icone lucide (voir lib/icon-map.ts)
  color: string // primary | cyan | green | yellow | orange | red | pink | purple
  category: CustomCommandCategory
  orderIndex: number
  inputs: CustomCommandInput[]
  luaCode: string
  enabled: boolean
  confirmRequired: boolean
  createdAt: number
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
