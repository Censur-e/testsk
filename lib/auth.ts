import { NextResponse } from "next/server"

// Cle partagee entre le script Roblox et le panel.
// A definir dans les variables d'environnement du projet Vercel.
const SERVER_KEY = process.env.SKYDRIVE_SERVER_KEY

export function verifyRobloxRequest(req: Request): NextResponse | null {
  const key = req.headers.get("x-skydrive-key")
  if (!SERVER_KEY) {
    // En dev, on laisse passer mais on log
    console.warn("[skydrive] SKYDRIVE_SERVER_KEY non definie - auth desactivee")
    return null
  }
  if (key !== SERVER_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

// Le panel web (meme origine) n'est pas protege ici par defaut.
// En prod : ajouter une session NextAuth, Supabase Auth, ou cookie signe.
export function verifyPanelRequest(_req: Request): NextResponse | null {
  return null
}
