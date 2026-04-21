// Store central Skydrive Panel — persistance Supabase.
// Toutes les fonctions sont ASYNC. Les routes API doivent `await`.

import { getSupabase } from "@/lib/supabase/server"
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

const MAX_LOGS = 500

function nowISOTime(d = new Date()) {
  return d.toTimeString().slice(0, 8)
}

function tsToMs(v: string | null | undefined): number {
  if (!v) return 0
  const t = Date.parse(v)
  return Number.isNaN(t) ? 0 : t
}

// ============ PLAYERS ============

type LiveRow = {
  user_id: number | string
  name: string
  display_name: string | null
  role: string
  health: number
  max_health: number
  armor: number
  ping: number
  team: string | null
  position_x: number
  position_y: number
  position_z: number
  kills: number
  deaths: number
  inventory: unknown
  joined_at: string
  updated_at: string
}

function rowToPlayer(r: LiveRow): Player {
  const id = String(r.user_id)
  const joined = tsToMs(r.joined_at)
  const playtimeMin = joined ? Math.max(0, Math.floor((Date.now() - joined) / 60000)) : 0
  return {
    id,
    username: r.name,
    avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=150`,
    health: Math.round(r.health ?? 0),
    armor: Math.round(r.armor ?? 0),
    ping: Math.round(r.ping ?? 0),
    role: (r.role as Player["role"]) ?? "Joueur",
    position: {
      x: Math.round((r.position_x ?? 0) * 10) / 10,
      y: Math.round((r.position_y ?? 0) * 10) / 10,
      z: Math.round((r.position_z ?? 0) * 10) / 10,
    },
    money: 0,
    kills: r.kills ?? 0,
    deaths: r.deaths ?? 0,
    playtime: `${playtimeMin}m`,
    team: r.team ?? "Neutre",
    items: Array.isArray(r.inventory) ? (r.inventory as string[]) : [],
    lastSeen: tsToMs(r.updated_at),
  }
}

function parseUserId(id: string): number | null {
  const n = Number(id)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export async function upsertPlayers(players: Player[]) {
  const sb = getSupabase()
  const seen: number[] = []
  const rows = players
    .map((p) => {
      const uid = parseUserId(p.id)
      if (uid === null) return null
      seen.push(uid)
      return {
        user_id: uid,
        name: p.username,
        display_name: p.username,
        role: p.role ?? "Joueur",
        health: p.health ?? 100,
        max_health: 100,
        armor: p.armor ?? 0,
        ping: p.ping ?? 0,
        team: p.team ?? null,
        position_x: p.position?.x ?? 0,
        position_y: p.position?.y ?? 0,
        position_z: p.position?.z ?? 0,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        inventory: p.items ?? [],
        updated_at: new Date().toISOString(),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (rows.length > 0) {
    await sb.from("live_players").upsert(rows, { onConflict: "user_id" })
  }

  // Supprime tous les joueurs non vus
  if (seen.length > 0) {
    await sb.from("live_players").delete().not("user_id", "in", `(${seen.join(",")})`)
  } else {
    await sb.from("live_players").delete().gte("user_id", 0).lte("user_id", Number.MAX_SAFE_INTEGER)
  }

  // Ajoute les joueurs dans economy s'ils n'existent pas
  if (players.length > 0) {
    const money = players.map((p) => {
      const uid = parseUserId(p.id)
      return uid
        ? {
            user_id: uid,
            player_name: p.username,
            money: p.money ?? 0,
            last_updated: new Date().toISOString(),
          }
        : null
    })
    const valid = money.filter(Boolean) as Array<Record<string, unknown>>
    if (valid.length > 0) {
      await sb.from("economy").upsert(valid, { onConflict: "user_id", ignoreDuplicates: false })
    }
  }
}

export async function getPlayers(): Promise<Player[]> {
  const sb = getSupabase()
  const { data } = await sb.from("live_players").select("*").order("joined_at", { ascending: true })
  const rows = (data ?? []) as LiveRow[]
  // Enrichit avec l'argent depuis economy (best effort)
  if (rows.length === 0) return []
  const ids = rows.map((r) => Number(r.user_id))
  const { data: econ } = await sb.from("economy").select("user_id, money").in("user_id", ids)
  const moneyMap = new Map<string, number>()
  for (const e of econ ?? []) moneyMap.set(String(e.user_id), e.money ?? 0)
  return rows.map((r) => ({
    ...rowToPlayer(r),
    money: moneyMap.get(String(r.user_id)) ?? 0,
  }))
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  const uid = parseUserId(id)
  if (uid === null) return undefined
  const sb = getSupabase()
  const { data } = await sb.from("live_players").select("*").eq("user_id", uid).maybeSingle()
  if (!data) return undefined
  const { data: econ } = await sb.from("economy").select("money").eq("user_id", uid).maybeSingle()
  return { ...rowToPlayer(data as LiveRow), money: econ?.money ?? 0 }
}

// ============ TRIGGERS ============
// Conventions de mapping (schema inchange) :
//   condition_type = icon name (ex: "wifi")
//   condition_value = condition texte (ex: "Ping Joueur > 500")
//   action_type = "run"
//   action_value = action texte (ex: "Kick")

type TriggerRow = {
  id: string
  name: string
  condition_type: string
  condition_value: string
  action_type: string
  action_value: string
  enabled: boolean
  matches: number
  created_at: string
}

function rowToTrigger(r: TriggerRow): Trigger {
  return {
    id: r.id,
    name: r.name,
    condition: r.condition_value,
    action: r.action_value,
    enabled: r.enabled,
    triggered: r.matches ?? 0,
    icon: (r.condition_type as TriggerIcon) ?? "zap",
    createdAt: tsToMs(r.created_at),
  }
}

export async function listTriggers(): Promise<Trigger[]> {
  const sb = getSupabase()
  const { data } = await sb.from("triggers").select("*").order("created_at", { ascending: true })
  return ((data ?? []) as TriggerRow[]).map(rowToTrigger)
}

export async function createTrigger(
  data: Omit<Trigger, "id" | "createdAt" | "triggered">,
): Promise<Trigger> {
  const sb = getSupabase()
  const { data: row } = await sb
    .from("triggers")
    .insert({
      name: data.name,
      condition_type: data.icon ?? "zap",
      condition_value: data.condition,
      action_type: "run",
      action_value: data.action,
      enabled: data.enabled,
    })
    .select("*")
    .single()
  return rowToTrigger(row as TriggerRow)
}

export async function updateTrigger(id: string, patch: Partial<Trigger>): Promise<Trigger | undefined> {
  const sb = getSupabase()
  const mapped: Record<string, unknown> = {}
  if (patch.name !== undefined) mapped.name = patch.name
  if (patch.condition !== undefined) mapped.condition_value = patch.condition
  if (patch.action !== undefined) mapped.action_value = patch.action
  if (patch.enabled !== undefined) mapped.enabled = patch.enabled
  if (patch.icon !== undefined) mapped.condition_type = patch.icon
  if (patch.triggered !== undefined) mapped.matches = patch.triggered
  mapped.updated_at = new Date().toISOString()
  const { data } = await sb.from("triggers").update(mapped).eq("id", id).select("*").maybeSingle()
  if (!data) return undefined
  return rowToTrigger(data as TriggerRow)
}

export async function deleteTrigger(id: string): Promise<boolean> {
  const sb = getSupabase()
  const { error, count } = await sb.from("triggers").delete({ count: "exact" }).eq("id", id)
  if (error) return false
  return (count ?? 0) > 0
}

export async function incrementTriggerCount(id: string) {
  const sb = getSupabase()
  const { data } = await sb.from("triggers").select("matches").eq("id", id).maybeSingle()
  if (!data) return
  await sb
    .from("triggers")
    .update({ matches: (data.matches ?? 0) + 1, last_triggered_at: new Date().toISOString() })
    .eq("id", id)
}

// ============ LOGS ============
type LogRow = {
  id: string
  type: ConsoleMessage["type"]
  source: string
  message: string
  created_at: string
}

function rowToLog(r: LogRow): ConsoleMessage {
  const d = new Date(r.created_at)
  return {
    id: r.id,
    type: r.type,
    text: r.message,
    time: nowISOTime(d),
    createdAt: d.getTime(),
  }
}

export async function appendLog(msg: Omit<ConsoleMessage, "id" | "time" | "createdAt">) {
  const sb = getSupabase()
  await sb.from("logs").insert({ type: msg.type, message: msg.text, source: "panel" })

  // Best effort : on garde au plus MAX_LOGS lignes (purge vieux)
  const { count } = await sb.from("logs").select("*", { count: "exact", head: true })
  if ((count ?? 0) > MAX_LOGS * 1.2) {
    const { data: old } = await sb
      .from("logs")
      .select("id")
      .order("created_at", { ascending: true })
      .limit((count ?? 0) - MAX_LOGS)
    const ids = (old ?? []).map((r: { id: string }) => r.id)
    if (ids.length > 0) await sb.from("logs").delete().in("id", ids)
  }
}

export async function listLogs(limit = 100): Promise<ConsoleMessage[]> {
  const sb = getSupabase()
  const { data } = await sb
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  return ((data ?? []) as LogRow[]).reverse().map(rowToLog)
}

// ============ COMMANDS ============
type CmdRow = {
  id: string
  type: string
  target_user_id: number | string | null
  target_name: string | null
  payload: Record<string, unknown>
  status: string
  error: string | null
  created_at: string
  delivered_at: string | null
  executed_at: string | null
}

function rowToCommand(r: CmdRow): Command {
  const payload = (r.payload ?? {}) as Record<string, unknown>
  const issuedBy = typeof payload._issuedBy === "string" ? (payload._issuedBy as string) : undefined
  const cleanPayload = { ...payload }
  delete (cleanPayload as Record<string, unknown>)._issuedBy
  const targetId =
    r.target_user_id !== null && r.target_user_id !== undefined
      ? String(r.target_user_id)
      : r.target_name ?? undefined
  return {
    id: r.id,
    kind: r.type as CommandKind,
    targetId,
    payload: cleanPayload,
    createdAt: tsToMs(r.created_at),
    status: r.status === "done" ? "acked" : (r.status as Command["status"]),
    ackedAt: tsToMs(r.executed_at) || undefined,
    error: r.error ?? undefined,
    issuedBy,
  }
}

export async function enqueueCommand(
  kind: CommandKind,
  opts: { targetId?: string; payload?: Record<string, unknown>; issuedBy?: string } = {},
): Promise<Command> {
  const sb = getSupabase()
  const payload: Record<string, unknown> = { ...(opts.payload ?? {}) }
  if (opts.issuedBy) payload._issuedBy = opts.issuedBy

  let target_user_id: number | null = null
  let target_name: string | null = null
  if (opts.targetId) {
    const n = parseUserId(opts.targetId)
    if (n !== null) target_user_id = n
    else target_name = opts.targetId
  }

  const { data } = await sb
    .from("command_queue")
    .insert({
      type: kind,
      target_user_id,
      target_name,
      payload,
      status: "pending",
    })
    .select("*")
    .single()

  await appendLog({
    type: "info",
    text: `[CMD] ${kind}${opts.targetId ? ` -> ${opts.targetId}` : ""} en file`,
  })
  return rowToCommand(data as CmdRow)
}

export async function getPendingCommands(): Promise<Command[]> {
  const sb = getSupabase()
  const { data } = await sb
    .from("command_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50)

  // Marque comme "delivered" pour eviter double-execution
  const rows = (data ?? []) as CmdRow[]
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id)
    await sb
      .from("command_queue")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .in("id", ids)
  }
  return rows.map(rowToCommand)
}

export async function ackCommand(id: string, success: boolean, error?: string) {
  const sb = getSupabase()
  await sb
    .from("command_queue")
    .update({
      status: success ? "done" : "failed",
      executed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("id", id)

  // Cleanup : garde les 500 dernieres commandes traitees
  const { count } = await sb
    .from("command_queue")
    .select("*", { count: "exact", head: true })
    .in("status", ["done", "failed"])
  if ((count ?? 0) > 500) {
    const { data: old } = await sb
      .from("command_queue")
      .select("id")
      .in("status", ["done", "failed"])
      .order("created_at", { ascending: true })
      .limit((count ?? 0) - 500)
    const ids = (old ?? []).map((r: { id: string }) => r.id)
    if (ids.length > 0) await sb.from("command_queue").delete().in("id", ids)
  }
}

export async function listCommands(limit = 50): Promise<Command[]> {
  const sb = getSupabase()
  const { data } = await sb
    .from("command_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  return ((data ?? []) as CmdRow[]).map(rowToCommand)
}

// ============ WORLD ============

type WorldRow = {
  gravity: number
  jump_power: number
  walk_speed: number
  time_of_day: number
  weather: string
  pvp_enabled: boolean
  fog_enabled: boolean
  day_night_cycle: boolean
}

function rowToWorld(r: WorldRow): WorldState {
  return {
    gravity: r.gravity,
    jumpHeight: r.jump_power / 7, // approx. JumpHeight ≈ JumpPower/7
    walkSpeed: r.walk_speed,
    timeOfDay: r.time_of_day,
    autoCycle: r.day_night_cycle,
    weather: r.weather as WorldState["weather"],
    pvpEnabled: r.pvp_enabled,
    friendlyFire: r.fog_enabled, // repurpose fog_enabled -> friendlyFire
  }
}

export async function getWorld(): Promise<WorldState> {
  const sb = getSupabase()
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
    }
  }
  return rowToWorld(data as WorldRow)
}

export async function updateWorld(patch: Partial<WorldState>): Promise<WorldState> {
  const sb = getSupabase()
  const mapped: Record<string, unknown> = {}
  if (patch.gravity !== undefined) mapped.gravity = patch.gravity
  if (patch.jumpHeight !== undefined) mapped.jump_power = patch.jumpHeight * 7
  if (patch.walkSpeed !== undefined) mapped.walk_speed = patch.walkSpeed
  if (patch.timeOfDay !== undefined) mapped.time_of_day = patch.timeOfDay
  if (patch.autoCycle !== undefined) mapped.day_night_cycle = patch.autoCycle
  if (patch.weather !== undefined) mapped.weather = patch.weather
  if (patch.pvpEnabled !== undefined) mapped.pvp_enabled = patch.pvpEnabled
  if (patch.friendlyFire !== undefined) mapped.fog_enabled = patch.friendlyFire
  mapped.updated_at = new Date().toISOString()
  await sb.from("world_state").update(mapped).eq("id", 1)
  return getWorld()
}

// ============ BANS ============
type BanRow = {
  id: string
  user_id: number | null
  player_name: string
  reason: string
  banned_by: string
  permanent: boolean
  expires_at: string | null
  created_at: string
}

function rowToBan(r: BanRow): BanRecord {
  return {
    userId: String(r.user_id ?? ""),
    username: r.player_name,
    reason: r.reason,
    bannedBy: r.banned_by,
    bannedAt: tsToMs(r.created_at),
    expiresAt: r.expires_at ? tsToMs(r.expires_at) : undefined,
  }
}

export async function listBans(): Promise<BanRecord[]> {
  const sb = getSupabase()
  const { data } = await sb.from("bans").select("*").order("created_at", { ascending: false })
  return ((data ?? []) as BanRow[]).map(rowToBan)
}

export async function addBan(ban: BanRecord) {
  const sb = getSupabase()
  const uid = parseUserId(ban.userId)
  await sb.from("bans").insert({
    user_id: uid,
    player_name: ban.username,
    reason: ban.reason,
    banned_by: ban.bannedBy,
    permanent: !ban.expiresAt,
    expires_at: ban.expiresAt ? new Date(ban.expiresAt).toISOString() : null,
  })
}

export async function removeBan(userId: string) {
  const sb = getSupabase()
  const uid = parseUserId(userId)
  if (uid === null) return
  await sb.from("bans").delete().eq("user_id", uid)
}

export async function isBanned(userId: string): Promise<BanRecord | undefined> {
  const sb = getSupabase()
  const uid = parseUserId(userId)
  if (uid === null) return undefined
  const { data } = await sb
    .from("bans")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
  const row = (data ?? [])[0] as BanRow | undefined
  if (!row) return undefined
  if (row.expires_at && tsToMs(row.expires_at) < Date.now()) {
    await sb.from("bans").delete().eq("id", row.id)
    return undefined
  }
  return rowToBan(row)
}

// ============ ECONOMY ============
type EconRow = {
  user_id: number | string
  player_name: string
  money: number
  bank: number
  last_updated: string
}

function rowToEconomy(r: EconRow): EconomyEntry {
  return {
    userId: String(r.user_id),
    username: r.player_name,
    balance: r.money ?? 0,
    totalEarned: r.bank ?? 0,
    totalSpent: 0,
    updatedAt: tsToMs(r.last_updated),
  }
}

export async function listEconomy(): Promise<EconomyEntry[]> {
  const sb = getSupabase()
  const { data } = await sb.from("economy").select("*").order("money", { ascending: false })
  return ((data ?? []) as EconRow[]).map(rowToEconomy)
}

export async function upsertEconomyBulk(entries: EconomyEntry[]) {
  const sb = getSupabase()
  const rows = entries
    .map((e) => {
      const uid = parseUserId(e.userId)
      if (uid === null) return null
      return {
        user_id: uid,
        player_name: e.username,
        money: e.balance,
        bank: e.totalEarned,
        last_updated: new Date().toISOString(),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>
  if (rows.length > 0) {
    await sb.from("economy").upsert(rows, { onConflict: "user_id" })
  }
}

export async function adjustBalance(userId: string, username: string, delta: number): Promise<EconomyEntry> {
  const sb = getSupabase()
  const uid = parseUserId(userId)
  if (uid === null) throw new Error("userId invalide")

  const { data: existing } = await sb
    .from("economy")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle()

  const prev = (existing as EconRow | null) ?? null
  const nextBalance = (prev?.money ?? 0) + delta
  const nextEarned = delta > 0 ? (prev?.bank ?? 0) + delta : (prev?.bank ?? 0)

  await sb.from("economy").upsert(
    {
      user_id: uid,
      player_name: username,
      money: nextBalance,
      bank: nextEarned,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  await sb.from("economy_transactions").insert({
    user_id: uid,
    player_name: username,
    delta,
    kind: delta > 0 ? "credit" : "debit",
  })

  return {
    userId: String(uid),
    username,
    balance: nextBalance,
    totalEarned: nextEarned,
    totalSpent: delta < 0 ? Math.abs(delta) : 0,
    updatedAt: Date.now(),
  }
}

// ============ STATS ============

type StateRow = {
  online: boolean
  job_id: string | null
  place_id: number | null
  player_count: number
  max_players: number
  avg_ping: number
  uptime_seconds: number
  last_heartbeat: string | null
}

export async function setStats(s: ServerStats) {
  const sb = getSupabase()
  const payload = {
    id: 1,
    online: true,
    job_id: s.jobId,
    place_id: s.placeId ? Number(s.placeId) : null,
    player_count: s.playerCount,
    max_players: s.maxPlayers,
    avg_ping: s.avgPing,
    uptime_seconds: s.uptime,
    last_heartbeat: new Date(s.lastHeartbeat).toISOString(),
    updated_at: new Date().toISOString(),
  }
  await sb.from("server_state").upsert(payload, { onConflict: "id" })
}

export async function getStats(): Promise<ServerStats | null> {
  const sb = getSupabase()
  const { data } = await sb.from("server_state").select("*").eq("id", 1).maybeSingle()
  if (!data) return null
  const r = data as StateRow
  const heartbeat = r.last_heartbeat ? tsToMs(r.last_heartbeat) : 0
  return {
    serverId: r.place_id ? String(r.place_id) : "unknown",
    jobId: r.job_id ?? "unknown",
    placeId: r.place_id ? String(r.place_id) : "unknown",
    uptime: r.uptime_seconds,
    playerCount: r.player_count,
    maxPlayers: r.max_players,
    avgPing: r.avg_ping,
    cpuUsage: 0,
    memoryMB: 0,
    lastHeartbeat: heartbeat,
  }
}
