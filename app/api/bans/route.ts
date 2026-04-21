import { NextResponse } from "next/server"
import { addBan, enqueueCommand, listBans, removeBan } from "@/lib/store"

export async function GET() {
  return NextResponse.json({ bans: await listBans() })
}

export async function POST(req: Request) {
  let body: {
    userId?: string
    username?: string
    reason?: string
    bannedBy?: string
    durationMs?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.userId || !body.username) {
    return NextResponse.json({ error: "Missing userId or username" }, { status: 400 })
  }

  const expiresAt = body.durationMs ? Date.now() + body.durationMs : undefined
  await addBan({
    userId: body.userId,
    username: body.username,
    reason: body.reason ?? "Aucune raison",
    bannedBy: body.bannedBy ?? "Panel",
    bannedAt: Date.now(),
    expiresAt,
  })

  await enqueueCommand("ban", {
    targetId: body.userId,
    payload: { reason: body.reason, expiresAt },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  await removeBan(userId)
  await enqueueCommand("unban", { targetId: userId })
  return NextResponse.json({ ok: true })
}
