import { NextResponse } from "next/server"
import { verifyRobloxRequest } from "@/lib/auth"
import { appendLog, listLogs } from "@/lib/store"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(500, parseInt(url.searchParams.get("limit") ?? "100", 10) || 100)
  return NextResponse.json({ logs: listLogs(limit) })
}

// POST /api/logs - utilise par Roblox pour streamer les logs
export async function POST(req: Request) {
  const auth = verifyRobloxRequest(req)
  if (auth) return auth

  let body: {
    entries?: { type: "info" | "success" | "error" | "warning" | "chat"; text: string }[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const entries = Array.isArray(body.entries) ? body.entries : []
  for (const e of entries) {
    if (e?.type && e?.text) appendLog({ type: e.type, text: e.text })
  }

  return NextResponse.json({ ok: true, count: entries.length })
}
