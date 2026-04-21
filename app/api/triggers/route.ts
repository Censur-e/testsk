import { NextResponse } from "next/server"
import { createTrigger, listTriggers } from "@/lib/store"
import type { TriggerIcon } from "@/lib/types"

export async function GET() {
  return NextResponse.json({ triggers: listTriggers() })
}

export async function POST(req: Request) {
  let body: {
    name?: string
    condition?: string
    action?: string
    enabled?: boolean
    icon?: TriggerIcon
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.name || !body.condition || !body.action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const trigger = createTrigger({
    name: body.name,
    condition: body.condition,
    action: body.action,
    enabled: body.enabled ?? true,
    icon: (body.icon ?? "zap") as TriggerIcon,
  })
  return NextResponse.json({ ok: true, trigger })
}
