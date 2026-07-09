import { NextResponse } from "next/server"
import { getDbStats, runCleanup } from "@/lib/store"
import type { CleanupConfig } from "@/lib/store"

// GET /api/cleanup → stats de chaque table (nombre de lignes, plus ancienne entree)
export async function GET() {
  try {
    const stats = await getDbStats()
    return NextResponse.json({ ok: true, stats })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// POST /api/cleanup { logs, command_queue, live_players, economy_transactions }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CleanupConfig>

    const config: CleanupConfig = {
      logs: Math.max(0, Number(body.logs ?? 7)),
      command_queue: Math.max(0, Number(body.command_queue ?? 3)),
      live_players: Math.max(0, Number(body.live_players ?? 10)),
      economy_transactions: Math.max(0, Number(body.economy_transactions ?? 30)),
    }

    const results = await runCleanup(config)
    const totalDeleted = results.reduce((s, r) => s + r.deleted, 0)

    return NextResponse.json({ ok: true, results, totalDeleted })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
