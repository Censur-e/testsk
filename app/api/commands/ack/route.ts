import { NextResponse } from "next/server"
import { verifyRobloxRequest } from "@/lib/auth"
import { ackCommand, appendLog } from "@/lib/store"

// POST /api/commands/ack
// Appele par Roblox apres avoir execute une commande.
// Corps : { acks: [{ id, success, error? }] }
export async function POST(req: Request) {
  const auth = verifyRobloxRequest(req)
  if (auth) return auth

  let body: { acks?: { id: string; success: boolean; error?: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const acks = Array.isArray(body.acks) ? body.acks : []
  for (const a of acks) {
    ackCommand(a.id, a.success, a.error)
    if (!a.success) {
      appendLog({ type: "error", text: `[CMD ${a.id}] echec: ${a.error ?? "inconnu"}` })
    }
  }

  return NextResponse.json({ ok: true, processed: acks.length })
}
