import { NextResponse } from "next/server"
import { verifyRobloxRequest } from "@/lib/auth"
import { upsertPlayers, setStats, getPendingCommands, appendLog } from "@/lib/store"
import type { Player, ServerStats } from "@/lib/types"

// POST /api/heartbeat
// Appele par le script Roblox toutes les ~2-5 secondes.
// Reponse : liste des commandes en attente pour ce serveur.
export async function POST(req: Request) {
  const auth = verifyRobloxRequest(req)
  if (auth) return auth

  let body: {
    serverId?: string
    jobId?: string
    placeId?: string
    uptime?: number
    maxPlayers?: number
    cpuUsage?: number
    memoryMB?: number
    players?: Player[]
    logs?: { type: "info" | "success" | "error" | "warning" | "chat"; text: string }[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const players = Array.isArray(body.players) ? body.players : []
  await upsertPlayers(players)

  if (Array.isArray(body.logs)) {
    for (const l of body.logs.slice(-50)) {
      if (l?.text && l?.type) await appendLog({ type: l.type, text: l.text })
    }
  }

  const avgPing =
    players.length > 0
      ? Math.round(players.reduce((acc, p) => acc + (p.ping || 0), 0) / players.length)
      : 0

  const stats: ServerStats = {
    serverId: body.serverId ?? "unknown",
    jobId: body.jobId ?? "unknown",
    placeId: body.placeId ?? "unknown",
    uptime: body.uptime ?? 0,
    playerCount: players.length,
    maxPlayers: body.maxPlayers ?? 30,
    avgPing,
    cpuUsage: body.cpuUsage ?? 0,
    memoryMB: body.memoryMB ?? 0,
    lastHeartbeat: Date.now(),
  }
  await setStats(stats)

  const pending = await getPendingCommands()

  return NextResponse.json({
    ok: true,
    receivedAt: Date.now(),
    commands: pending,
  })
}
