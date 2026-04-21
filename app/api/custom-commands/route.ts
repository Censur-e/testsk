import { NextResponse } from "next/server"
import { verifyPanelRequest } from "@/lib/auth"
import { createCustomCommand, listCustomCommands } from "@/lib/store"
import type { CustomCommand, CustomCommandCategory } from "@/lib/types"

export async function GET(req: Request) {
  const auth = verifyPanelRequest(req)
  if (auth) return auth

  const url = new URL(req.url)
  const category = url.searchParams.get("category") as CustomCommandCategory | null
  const all = await listCustomCommands(category ?? undefined)
  return NextResponse.json({ commands: all })
}

export async function POST(req: Request) {
  const auth = verifyPanelRequest(req)
  if (auth) return auth

  let body: Partial<CustomCommand>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.name || !body.category) {
    return NextResponse.json({ error: "Missing name or category" }, { status: 400 })
  }

  const created = await createCustomCommand({
    name: body.name,
    description: body.description ?? "",
    icon: body.icon ?? "zap",
    color: body.color ?? "primary",
    category: body.category,
    inputs: body.inputs ?? [],
    luaCode: body.luaCode ?? "",
    enabled: body.enabled ?? true,
    confirmRequired: body.confirmRequired ?? false,
  })
  return NextResponse.json({ ok: true, command: created })
}
