import { NextResponse } from "next/server"
import { verifyPanelRequest } from "@/lib/auth"
import { reorderCustomCommands } from "@/lib/store"
import type { CustomCommandCategory } from "@/lib/types"

export async function POST(req: Request) {
  const auth = verifyPanelRequest(req)
  if (auth) return auth

  let body: { category?: CustomCommandCategory; orderedIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.category || !Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: "Missing category or orderedIds" }, { status: 400 })
  }

  await reorderCustomCommands(body.category, body.orderedIds)
  return NextResponse.json({ ok: true })
}
