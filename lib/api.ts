"use client"

import useSWR, { mutate as globalMutate } from "swr"
import type {
  Player,
  Trigger,
  ConsoleMessage,
  WorldState,
  BanRecord,
  EconomyEntry,
  ServerStats,
  CommandKind,
  Command,
  CustomCommand,
  CustomCommandCategory,
} from "./types"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ============ HOOKS SWR ============
export function usePlayers() {
  const { data, error, isLoading } = useSWR<{ players: Player[] }>("/api/players", fetcher, {
    refreshInterval: 3000,
  })
  return { players: data?.players ?? [], isLoading, error }
}

export function useTriggers() {
  const { data, error, isLoading } = useSWR<{ triggers: Trigger[] }>("/api/triggers", fetcher, {
    refreshInterval: 5000,
  })
  return { triggers: data?.triggers ?? [], isLoading, error }
}

export function useLogs(limit = 100) {
  const { data, error, isLoading } = useSWR<{ logs: ConsoleMessage[] }>(
    `/api/logs?limit=${limit}`,
    fetcher,
    { refreshInterval: 2000 },
  )
  return { logs: data?.logs ?? [], isLoading, error }
}

export function useWorld() {
  const { data, error, isLoading } = useSWR<{ world: WorldState }>("/api/world", fetcher, {
    refreshInterval: 5000,
  })
  return { world: data?.world, isLoading, error }
}

export function useBans() {
  const { data, error, isLoading } = useSWR<{ bans: BanRecord[] }>("/api/bans", fetcher, {
    refreshInterval: 10_000,
  })
  return { bans: data?.bans ?? [], isLoading, error }
}

export function useEconomy() {
  const { data, error, isLoading } = useSWR<{ economy: EconomyEntry[] }>("/api/economy", fetcher, {
    refreshInterval: 5000,
  })
  return { economy: data?.economy ?? [], isLoading, error }
}

export function useStats() {
  const { data, error, isLoading } = useSWR<{
    server: ServerStats | null
    counts: { players: number; activeTriggers: number; bans: number; commandsLastHour: number }
    avgPing: number
    online: boolean
  }>("/api/stats", fetcher, { refreshInterval: 3000 })
  return { stats: data, isLoading, error }
}

export function useCommands() {
  const { data, error, isLoading } = useSWR<{ commands: Command[] }>("/api/commands", fetcher, {
    refreshInterval: 3000,
  })
  return { commands: data?.commands ?? [], isLoading, error }
}

// ============ MUTATIONS ============
export async function sendCommand(
  kind: CommandKind,
  opts: { targetId?: string; payload?: Record<string, unknown>; issuedBy?: string } = {},
) {
  const res = await fetch("/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, ...opts }),
  })
  if (!res.ok) throw new Error("Echec de l'envoi de la commande")
  globalMutate("/api/commands")
  return res.json() as Promise<{ ok: boolean; command: Command }>
}

export async function executeLua(code: string, issuedBy?: string) {
  const res = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, issuedBy }),
  })
  if (!res.ok) throw new Error(await res.text())
  globalMutate("/api/logs?limit=100")
  return res.json()
}

export async function createTrigger(data: {
  name: string
  condition: string
  action: string
  enabled?: boolean
  icon?: string
}) {
  const res = await fetch("/api/triggers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Echec de creation")
  globalMutate("/api/triggers")
  return res.json()
}

export async function patchTrigger(id: string, patch: Partial<Trigger>) {
  const res = await fetch(`/api/triggers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Echec de mise a jour")
  globalMutate("/api/triggers")
  return res.json()
}

export async function removeTrigger(id: string) {
  const res = await fetch(`/api/triggers/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Echec de suppression")
  globalMutate("/api/triggers")
  return res.json()
}

export async function patchWorld(patch: Partial<WorldState>) {
  const res = await fetch("/api/world", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Echec de mise a jour du monde")
  globalMutate("/api/world")
  return res.json()
}

export async function adjustMoney(userId: string, username: string, delta: number, reason?: string) {
  const res = await fetch("/api/economy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username, delta, reason }),
  })
  if (!res.ok) throw new Error("Echec de transfert")
  globalMutate("/api/economy")
  return res.json()
}

// ============ CUSTOM COMMANDS ============
export function useCustomCommands(category?: CustomCommandCategory) {
  const url = category ? `/api/custom-commands?category=${category}` : "/api/custom-commands"
  const { data, error, isLoading, mutate } = useSWR<{ commands: CustomCommand[] }>(
    url,
    fetcher,
    { refreshInterval: 10_000 },
  )
  return { commands: data?.commands ?? [], isLoading, error, mutate }
}

export async function createCustomCommand(
  data: Omit<CustomCommand, "id" | "createdAt" | "updatedAt" | "orderIndex">,
) {
  const res = await fetch("/api/custom-commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Echec creation")
  globalMutate("/api/custom-commands")
  globalMutate(`/api/custom-commands?category=${data.category}`)
  return res.json() as Promise<{ ok: boolean; command: CustomCommand }>
}

export async function updateCustomCommand(id: string, patch: Partial<CustomCommand>) {
  const res = await fetch(`/api/custom-commands/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Echec mise a jour")
  globalMutate("/api/custom-commands")
  if (patch.category) globalMutate(`/api/custom-commands?category=${patch.category}`)
  globalMutate("/api/custom-commands?category=player")
  globalMutate("/api/custom-commands?category=world")
  return res.json()
}

export async function deleteCustomCommand(id: string) {
  const res = await fetch(`/api/custom-commands/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Echec suppression")
  globalMutate("/api/custom-commands")
  globalMutate("/api/custom-commands?category=player")
  globalMutate("/api/custom-commands?category=world")
  return res.json()
}

export async function reorderCustomCommands(
  category: CustomCommandCategory,
  orderedIds: string[],
) {
  const res = await fetch("/api/custom-commands/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, orderedIds }),
  })
  if (!res.ok) throw new Error("Echec reorder")
  globalMutate(`/api/custom-commands?category=${category}`)
  return res.json()
}

/** Execute une commande perso en envoyant le code Lua + inputs dans la payload */
export async function runCustomCommand(
  cmd: CustomCommand,
  inputs: Record<string, string>,
  targetId?: string,
) {
  return sendCommand("custom", {
    targetId,
    payload: {
      commandId: cmd.id,
      commandName: cmd.name,
      luaCode: cmd.luaCode,
      inputs,
    },
    issuedBy: "Panel",
  })
}

export async function banPlayer(
  userId: string,
  username: string,
  reason?: string,
  durationMs?: number,
) {
  const res = await fetch("/api/bans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, username, reason, durationMs }),
  })
  if (!res.ok) throw new Error("Echec du ban")
  globalMutate("/api/bans")
  return res.json()
}
