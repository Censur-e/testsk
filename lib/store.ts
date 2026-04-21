// Store central Skydrive Panel - PERSISTENT via Supabase
//
// Un seul jeu = un seul PlaceId. Toutes les donnees vivent dans Supabase :
//   - triggers (regles Si/Alors persistantes)
//   - bans (liste de bannissement persistante, survit au redemarrage du jeu)
//   - economy (argent des joueurs, meme quand ils sont offline)
//   - world_state (gravite, jour/nuit, meteo ...) en singleton
//   - server_state (stats en singleton)
//   - live_players (snapshot remplace a chaque heartbeat)
//   - command_queue (file de commandes panel -> jeu)
//   - logs (console / chat)
//
// Toutes les fonctions exportees sont async (IO reseau).
import { supabaseAdmin } from "./supabase/admin"
import type {
  Player,
  Trigger,
  TriggerIcon,
  ConsoleMessage,
  Command,
  CommandKind,
  WorldState,
  BanRecord,
  EconomyEntry,
  ServerStats,
} from "./types"

const LOG_MAX = 500
const COMMAND_KEEP = 300

function nowISOTime() {
  return new Date().toTimeString().slice(0, 8)
}

// ---------- helpers de mapping (snake_case <-> camelCase) ----------

function rowToPlayer(r: Record<string, unknown>): Player {
  return {
    id: String(r.id),
    username: String(r.username),
    avatar: String(r.avatar ?? ""),
    health: Number(r.health ?? 100),
    armor: Number(r.armor ?? 0),
    ping: Number(r.ping ?? 0),
    role: (r.role as Player["role"]) ?? "Joueur",
    position: {
      x: Number(r.position_x ?? 0),
      y: Number(r.position_y ?? 0),
      z: Number(r.position_z ?? 0),
    },
    money: Number(r.money ?? 0),
    kills: Number(r.kills ?? 0),
    deaths: Number(r.deaths ?? 0),
    playtime: String(r.playtime ?? "0m"),
    team: String(r.team ?? ""),
    items: Array.isArray(r.items) ? (r.items as string[]) : [],
    lastSeen: r.last_seen ? new Date(r.last_seen as string).getTime() : Date.now(),
  }
}

function playerToRow(p: Player) {
  return {
    id: p.id,
    username: p.username,
    avatar: p.avatar ?? "",
    health: p.health,
    armor: p.armor,
    ping: p.ping,
    role: p.role,
    position_x: p.position?.x ?? 0,
    position_y: p.position?.y ?? 0,
    position_z: p.position?.z ?? 0,
    money: p.money ?? 0,
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    playtime: p.playtime ?? "0m",
    team: p.team ?? "",
    items: p.items ?? [],
    last_seen: new Date().toISOString(),
  }
}

function rowToTrigger(r: Record<string, unknown>): Trigger {
  return {
    id: String(r.id),
    name: String(r.name),
    condition: String(r.condition),
    action: String(r.action),
    enabled: Boolean(r.enabled),
    triggered: Number(r.triggered ?? 0),
    icon: (r.icon as TriggerIcon) ?? "zap",
    createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
  }
}

function rowToLog(r: Record<string, unknown>): ConsoleMessage {
  const d = r.created_at ? new Date(r.created_at as string) : new Date()
  return {
    id: String(r.id),
    type: (r.type as ConsoleMessage["type"]) ?? "info",
    text: String(r.text),
    time: d.toTimeString().slice(0, 8),
    createdAt: d.getTime(),
  }
}

function rowToCommand(r: Record<string, unknown>): Command {
  return {
    id: String(r.id),
    kind: r.kind as CommandKind,
    targetId: (r.target_id as string) ?? undefined,
    payload: (r.payload as Record<string, unknown>) ?? undefined,
    createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
    status: (r.status as Command["status"]) ?? "pending",
    ackedAt: r.acked_at ? new Date(r.acked_at as string).getTime() : undefined,
    error: (r.error as string) ?? undefined,
    issuedBy: (r.issued_by as string) ?? undefined,
  }
}

function rowToWorld(r: Record<string, unknown>): WorldState {
  return {
    gravity: Number(r.gravity ?? 196.2),
    jumpHeight: Number(r.jump_height ?? 7.2),
    walkSpeed: Number(r.walk_speed ?? 16),
    timeOfDay: Number(r.time_of_day ?? 14),
    autoCycle: Boolean(r.auto_cycle ?? true),
    weather: (r.weather as WorldState["weather"]) ?? "clear",
    pvpEnabled: Boolean(r.pvp_enabled ?? true),
    friendlyFire: Boolean(r.friendly_fire ?? false),
    serverLocked: Boolean(r.server_locked ?? false),
    mapClosed: Boolean(r.map_closed ?? false),
    maintenanceMode: Boolean(r.maintenance_mode ?? false),
    fallDamage: Boolean(r.fall_damage ?? true),
    slowMotion: Number(r.slow_motion ?? 1),
    maxPlayers: Number(r.max_players ?? 30),
  }
}

function rowToBan(r: Record<string, unknown>): BanRecord {
  return {
    userId: String(r.user_id),
    username: String(r.username),
    reason: String(r.reason ?? ""),
    bannedBy: String(r.banned_by ?? "Admin"),
    bannedAt: r.banned_at ? new Date(r.banned_at as string).getTime() : Date.now(),
    expiresAt: r.expires_at ? new Date(r.expires_at as string).getTime() : undefined,
  }
}

function rowToEconomy(r: Record<string, unknown>): EconomyEntry {
  return {
    userId: String(r.user_id),
    username: String(r.username),
    balance: Number(r.balance ?? 0),
    totalEarned: Number(r.total_earned ?? 0),
    totalSpent: Number(r.total_spent ?? 0),
    updatedAt: r.updated_at ? new Date(r.updated_at as string).getTime() : Date.now(),
  }
}

function rowToStats(r: Record<string, unknown>): ServerStats {
  return {
    serverId: String(r.server_id ?? "unknown"),
    jobId: String(r.job_id ?? "unknown"),
    placeId: String(r.place_id ?? "unknown"),
    uptime: Number(r.uptime ?? 0),
    playerCount: Number(r.player_count ?? 0),
    maxPlayers: Number(r.max_players ?? 30),
    avgPing: Number(r.avg_ping ?? 0),
    cpuUsage: Number(r.cpu_usage ?? 0),
    memoryMB: Number(r.memory_mb ?? 0),
    lastHeartbeat: r.last_heartbeat ? new Date(r.last_heartbeat as string).getTime() : 0,
  }
}

// ============ PLAYERS ============

export async function upsertPlayers(players: Player[]) {
  const sb = supabaseAdmin()
  if (players.length === 0) {
    await sb.from("live_players").delete().neq("id", "__none__")
    return
  }
  const rows = players.map(playerToRow)
  const ids = players.map((p) => p.id)
  await sb.from("live_players").upsert(rows, { onConflict: "id" })
  // Retire les joueurs absents du dernier heartbeat
  await sb.from("live_players").delete().not("id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`)
}

export async function getPlayers(): Promise<Player[]> {
  const sb = supabaseAdmin()
  const { data, error } = await sb.from("live_players").select("*")
  if (error || !data) return []
  return data.map(rowToPlayer)
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("live_players").select("*").eq("id", id).maybeSingle()
  return data ? rowToPlayer(data) : undefined
}

// ============ TRIGGERS ============

export async function listTriggers(): Promise<Trigger[]> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("triggers").select("*").order("created_at", { ascending: true })
  return (data ?? []).map(rowToTrigger)
}

export async function createTrigger(
  data: Omit<Trigger, "id" | "createdAt" | "triggered">,
): Promise<Trigger> {
  const sb = supabaseAdmin()
  const { data: row, error } = await sb
    .from("triggers")
    .insert({
      name: data.name,
      condition: data.condition,
      action: data.action,
      enabled: data.enabled,
      icon: data.icon,
      triggered: 0,
    })
    .select()
    .single()
  if (error || !row) throw new Error(error?.message ?? "insert failed")
  return rowToTrigger(row)
}

export async function updateTrigger(
  id: string,
  patch: Partial<Trigger>,
): Promise<Trigger | undefined> {
  const sb = supabaseAdmin()
  const snake: Record<string, unknown> = {}
  if (patch.name !== undefined) snake.name = patch.name
  if (patch.condition !== undefined) snake.condition = patch.condition
  if (patch.action !== undefined) snake.action = patch.action
  if (patch.enabled !== undefined) snake.enabled = patch.enabled
  if (patch.icon !== undefined) snake.icon = patch.icon
  if (patch.triggered !== undefined) snake.triggered = patch.triggered
  const { data, error } = await sb.from("triggers").update(snake).eq("id", id).select().maybeSingle()
  if (error || !data) return undefined
  return rowToTrigger(data)
}

export async function deleteTrigger(id: string): Promise<boolean> {
  const sb = supabaseAdmin()
  const { error } = await sb.from("triggers").delete().eq("id", id)
  return !error
}

export async function incrementTriggerCount(id: string) {
  const sb = supabaseAdmin()
  const { data } = await sb.from("triggers").select("triggered").eq("id", id).maybeSingle()
  if (!data) return
  await sb
    .from("triggers")
    .update({ triggered: Number(data.triggered ?? 0) + 1 })
    .eq("id", id)
}

// ============ LOGS ============

export async function appendLog(msg: Omit<ConsoleMessage, "id" | "time" | "createdAt">) {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("logs")
    .insert({ type: msg.type, text: msg.text })
    .select()
    .maybeSingle()

  // Garde-fou : trim au-dela de LOG_MAX
  const { count } = await sb.from("logs").select("id", { count: "exact", head: true })
  if (count && count > LOG_MAX) {
    const toDelete = count - LOG_MAX
    const { data: old } = await sb
      .from("logs")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(toDelete)
    if (old?.length) {
      await sb
        .from("logs")
        .delete()
        .in("id", old.map((o) => o.id))
    }
  }

  return data
    ? rowToLog(data)
    : {
        id: "ephemeral",
        type: msg.type,
        text: msg.text,
        time: nowISOTime(),
        createdAt: Date.now(),
      }
}

export async function listLogs(limit = 100): Promise<ConsoleMessage[]> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  // On veut l'ordre chronologique ascendant dans l'UI
  return (data ?? []).map(rowToLog).reverse()
}

// ============ COMMANDS ============

export async function enqueueCommand(
  kind: CommandKind,
  opts: { targetId?: string; payload?: Record<string, unknown>; issuedBy?: string } = {},
): Promise<Command> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from("command_queue")
    .insert({
      kind,
      target_id: opts.targetId ?? null,
      payload: opts.payload ?? {},
      issued_by: opts.issuedBy ?? null,
      status: "pending",
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? "enqueue failed")
  await appendLog({
    type: "info",
    text: `[CMD] ${kind}${opts.targetId ? ` -> ${opts.targetId}` : ""} en file`,
  })
  return rowToCommand(data)
}

export async function getPendingCommands(): Promise<Command[]> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("command_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
  return (data ?? []).map(rowToCommand)
}

export async function ackCommand(id: string, success: boolean, error?: string) {
  const sb = supabaseAdmin()
  await sb
    .from("command_queue")
    .update({
      status: success ? "acked" : "failed",
      acked_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("id", id)

  // Trim : on garde les COMMAND_KEEP plus recentes
  const { count } = await sb.from("command_queue").select("id", { count: "exact", head: true })
  if (count && count > COMMAND_KEEP) {
    const toDelete = count - COMMAND_KEEP
    const { data: old } = await sb
      .from("command_queue")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(toDelete)
    if (old?.length) {
      await sb
        .from("command_queue")
        .delete()
        .in("id", old.map((o) => o.id))
    }
  }
}

export async function listCommands(limit = 50): Promise<Command[]> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("command_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []).map(rowToCommand)
}

// ============ WORLD ============

export async function getWorld(): Promise<WorldState> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("world_state").select("*").eq("id", 1).maybeSingle()
  if (!data) {
    return {
      gravity: 196.2,
      jumpHeight: 7.2,
      walkSpeed: 16,
      timeOfDay: 14,
      autoCycle: true,
      weather: "clear",
      pvpEnabled: true,
      friendlyFire: false,
      serverLocked: false,
      mapClosed: false,
      maintenanceMode: false,
      fallDamage: true,
      slowMotion: 1,
      maxPlayers: 30,
    }
  }
  return rowToWorld(data)
}

export async function updateWorld(patch: Partial<WorldState>): Promise<WorldState> {
  const sb = supabaseAdmin()
  const snake: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.gravity !== undefined) snake.gravity = patch.gravity
  if (patch.jumpHeight !== undefined) snake.jump_height = patch.jumpHeight
  if (patch.walkSpeed !== undefined) snake.walk_speed = patch.walkSpeed
  if (patch.timeOfDay !== undefined) snake.time_of_day = patch.timeOfDay
  if (patch.autoCycle !== undefined) snake.auto_cycle = patch.autoCycle
  if (patch.weather !== undefined) snake.weather = patch.weather
  if (patch.pvpEnabled !== undefined) snake.pvp_enabled = patch.pvpEnabled
  if (patch.friendlyFire !== undefined) snake.friendly_fire = patch.friendlyFire
  if (patch.serverLocked !== undefined) snake.server_locked = patch.serverLocked
  if (patch.mapClosed !== undefined) snake.map_closed = patch.mapClosed
  if (patch.maintenanceMode !== undefined) snake.maintenance_mode = patch.maintenanceMode
  if (patch.fallDamage !== undefined) snake.fall_damage = patch.fallDamage
  if (patch.slowMotion !== undefined) snake.slow_motion = patch.slowMotion
  if (patch.maxPlayers !== undefined) snake.max_players = patch.maxPlayers

  await sb.from("world_state").update(snake).eq("id", 1)
  return getWorld()
}

// ============ BANS ============

export async function listBans(): Promise<BanRecord[]> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("bans").select("*").order("banned_at", { ascending: false })
  return (data ?? []).map(rowToBan)
}

export async function addBan(ban: BanRecord) {
  const sb = supabaseAdmin()
  await sb.from("bans").upsert(
    {
      user_id: ban.userId,
      username: ban.username,
      reason: ban.reason,
      banned_by: ban.bannedBy,
      banned_at: new Date(ban.bannedAt).toISOString(),
      expires_at: ban.expiresAt ? new Date(ban.expiresAt).toISOString() : null,
    },
    { onConflict: "user_id" },
  )
}

export async function removeBan(userId: string) {
  const sb = supabaseAdmin()
  await sb.from("bans").delete().eq("user_id", userId)
}

export async function isBanned(userId: string): Promise<BanRecord | undefined> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("bans").select("*").eq("user_id", userId).maybeSingle()
  if (!data) return undefined
  const b = rowToBan(data)
  if (b.expiresAt && b.expiresAt < Date.now()) {
    await removeBan(userId)
    return undefined
  }
  return b
}

// ============ ECONOMY ============

export async function listEconomy(): Promise<EconomyEntry[]> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("economy").select("*").order("balance", { ascending: false })
  return (data ?? []).map(rowToEconomy)
}

export async function upsertEconomyBulk(entries: EconomyEntry[]) {
  if (entries.length === 0) return
  const sb = supabaseAdmin()
  const rows = entries.map((e) => ({
    user_id: e.userId,
    username: e.username,
    balance: e.balance,
    total_earned: e.totalEarned,
    total_spent: e.totalSpent,
    updated_at: new Date().toISOString(),
  }))
  await sb.from("economy").upsert(rows, { onConflict: "user_id" })
}

export async function adjustBalance(
  userId: string,
  username: string,
  delta: number,
  reason?: string,
): Promise<EconomyEntry> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("economy").select("*").eq("user_id", userId).maybeSingle()
  const existing = data ? rowToEconomy(data) : null
  const next: EconomyEntry = {
    userId,
    username,
    balance: (existing?.balance ?? 0) + delta,
    totalEarned: (existing?.totalEarned ?? 0) + (delta > 0 ? delta : 0),
    totalSpent: (existing?.totalSpent ?? 0) + (delta < 0 ? Math.abs(delta) : 0),
    updatedAt: Date.now(),
  }
  await sb.from("economy").upsert(
    {
      user_id: next.userId,
      username: next.username,
      balance: next.balance,
      total_earned: next.totalEarned,
      total_spent: next.totalSpent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  await sb.from("economy_transactions").insert({
    user_id: userId,
    username,
    delta,
    reason: reason ?? null,
  })
  return next
}

// ============ STATS ============

export async function setStats(s: ServerStats) {
  const sb = supabaseAdmin()
  await sb
    .from("server_state")
    .update({
      server_id: s.serverId,
      job_id: s.jobId,
      place_id: s.placeId,
      uptime: s.uptime,
      player_count: s.playerCount,
      max_players: s.maxPlayers,
      avg_ping: s.avgPing,
      cpu_usage: s.cpuUsage,
      memory_mb: s.memoryMB,
      last_heartbeat: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
}

export async function getStats(): Promise<ServerStats | null> {
  const sb = supabaseAdmin()
  const { data } = await sb.from("server_state").select("*").eq("id", 1).maybeSingle()
  if (!data || !data.last_heartbeat) return null
  return rowToStats(data)
}
