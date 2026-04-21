import { NextResponse } from "next/server"
import { enqueueCommand, getWorld, updateWorld } from "@/lib/store"
import type { WorldState } from "@/lib/types"

export async function GET() {
  return NextResponse.json({ world: getWorld() })
}

// PATCH /api/world
// Met a jour l'etat voulu + enqueue la commande set_world pour le serveur Roblox.
export async function PATCH(req: Request) {
  let body: Partial<WorldState>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updated = updateWorld(body)
  enqueueCommand("set_world", { payload: body as Record<string, unknown> })
  return NextResponse.json({ ok: true, world: updated })
}
