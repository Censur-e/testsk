import { readFileSync } from "node:fs"
import { join } from "node:path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/roblox-script
// Renvoie le script Luau complet, avec API_BASE + SERVER_KEY pre-injectees
// a partir des variables d'environnement ou des query params.
// Usage :
//   /api/roblox-script?apiBase=https://mon-panel.vercel.app&key=ma-cle
//   /api/roblox-script?format=lua   (text/x-lua pour telechargement direct)
export async function GET(req: Request) {
  const url = new URL(req.url)
  const apiBase =
    url.searchParams.get("apiBase")?.trim() ||
    process.env.SKYDRIVE_PUBLIC_URL ||
    `${url.origin}`
  const key =
    url.searchParams.get("key")?.trim() ||
    process.env.SKYDRIVE_SERVER_KEY ||
    "remplace-moi-par-une-cle-longue-et-secrete"
  const format = url.searchParams.get("format")

  let content: string
  try {
    const filePath = join(process.cwd(), "roblox", "SkydrivePanelServer.server.lua")
    content = readFileSync(filePath, "utf8")
  } catch {
    return NextResponse.json({ error: "Script introuvable" }, { status: 500 })
  }

  // Remplace les deux constantes de configuration en haut du script
  content = content
    .replace(
      /local API_BASE = "[^"]*"/,
      `local API_BASE = ${JSON.stringify(apiBase)}`,
    )
    .replace(
      /local SERVER_KEY = "[^"]*"/,
      `local SERVER_KEY = ${JSON.stringify(key)}`,
    )

  if (format === "lua") {
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/x-lua; charset=utf-8",
        "Content-Disposition": 'attachment; filename="SkydrivePanelServer.server.lua"',
      },
    })
  }

  return NextResponse.json({ ok: true, script: content, apiBase, keyLength: key.length })
}
