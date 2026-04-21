import { NextResponse } from "next/server"
import { verifyPanelRequest, verifyRobloxRequest } from "@/lib/auth"
import { enqueueCommand, getPendingCommands, listCommands } from "@/lib/store"
import type { CommandKind } from "@/lib/types"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const pendingOnly = url.searchParams.get("pending") === "1"

  if (pendingOnly) {
    const auth = verifyRobloxRequest(req)
    if (auth) return auth
    return NextResponse.json({ commands: await getPendingCommands() })
  }

  const auth = verifyPanelRequest(req)
  if (auth) return auth
  return NextResponse.json({ commands: await listCommands(50) })
}

export async function POST(req: Request) {
  const auth = verifyPanelRequest(req)
  if (auth) return auth

  let body: {
    kind?: CommandKind
    targetId?: string
    payload?: Record<string, unknown>
    issuedBy?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.kind) {
    return NextResponse.json({ error: "Missing 'kind'" }, { status: 400 })
  }

  const cmd = await enqueueCommand(body.kind, {
    targetId: body.targetId,
    payload: body.payload,
    issuedBy: body.issuedBy,
  })
  return NextResponse.json({ ok: true, command: cmd })
}
