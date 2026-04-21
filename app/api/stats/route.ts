import { NextResponse } from "next/server"
import { getPlayers, getStats, listBans, listCommands, listTriggers } from "@/lib/store"

export async function GET() {
  const [players, stats, triggers, bans, commands] = await Promise.all([
    getPlayers(),
    getStats(),
    listTriggers(),
    listBans(),
    listCommands(50),
  ])

  const activeTriggers = triggers.filter((t) => t.enabled).length
  const avgPing =
    players.length > 0 ? Math.round(players.reduce((a, p) => a + p.ping, 0) / players.length) : 0

  return NextResponse.json({
    server: stats,
    counts: {
      players: players.length,
      activeTriggers,
      bans: bans.length,
      commandsLastHour: commands.filter((c) => c.createdAt > Date.now() - 3600_000).length,
    },
    avgPing,
    online: stats ? Date.now() - stats.lastHeartbeat < 15_000 : false,
  })
}
