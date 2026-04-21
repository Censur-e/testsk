import { NextResponse } from "next/server"
import { adjustBalance, enqueueCommand, listEconomy, upsertEconomyBulk } from "@/lib/store"
import type { EconomyEntry } from "@/lib/types"

export async function GET() {
  return NextResponse.json({ economy: await listEconomy() })
}

export async function POST(req: Request) {
  let body: {
    bulk?: EconomyEntry[]
    userId?: string
    username?: string
    delta?: number
    reason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (Array.isArray(body.bulk)) {
    await upsertEconomyBulk(body.bulk)
    return NextResponse.json({ ok: true, count: body.bulk.length })
  }

  if (body.userId && body.username && typeof body.delta === "number") {
    const entry = await adjustBalance(body.userId, body.username, body.delta, body.reason)
    await enqueueCommand("set_money", {
      targetId: body.userId,
      payload: { delta: body.delta, reason: body.reason },
    })
    return NextResponse.json({ ok: true, entry })
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
}
