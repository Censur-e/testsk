import { NextResponse } from "next/server"
import { verifyPanelRequest } from "@/lib/auth"
import { deleteCustomCommand, updateCustomCommand } from "@/lib/store"
import type { CustomCommand } from "@/lib/types"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyPanelRequest(req)
  if (auth) return auth
  const { id } = await params

  let patch: Partial<CustomCommand>
  try {
    patch = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updated = await updateCustomCommand(id, patch)
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true, command: updated })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyPanelRequest(req)
  if (auth) return auth
  const { id } = await params
  const ok = await deleteCustomCommand(id)
  return NextResponse.json({ ok })
}
