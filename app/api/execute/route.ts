import { NextResponse } from "next/server"
import { appendLog, enqueueCommand } from "@/lib/store"

// POST /api/execute
// Envoie du code Lua au serveur Roblox pour execution via loadstring().
// IMPORTANT : activer LoadStringEnabled dans Game Settings > Security sur Roblox.
export async function POST(req: Request) {
  let body: { code?: string; issuedBy?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (typeof body.code !== "string" || body.code.trim().length === 0) {
    return NextResponse.json({ error: "Missing 'code'" }, { status: 400 })
  }

  if (body.code.length > 50_000) {
    return NextResponse.json({ error: "Code trop long (>50ko)" }, { status: 413 })
  }

  const cmd = await enqueueCommand("execute_lua", {
    payload: { code: body.code },
    issuedBy: body.issuedBy,
  })

  await appendLog({
    type: "info",
    text: `[LUA] Script envoye au serveur (${body.code.length} caracteres)`,
  })

  return NextResponse.json({ ok: true, command: cmd })
}
