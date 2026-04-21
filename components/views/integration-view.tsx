"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Copy,
  Download,
  Check,
  Shield,
  Globe2,
  KeyRound,
  Link as LinkIcon,
  RefreshCw,
  Info,
  FileCode,
} from "lucide-react"

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error("Erreur réseau")
    return r.json() as Promise<{ ok: boolean; script: string; apiBase: string }>
  })

// Coloration syntaxique minimaliste pour Luau (bleu/cyan/violet)
function highlightLua(code: string) {
  const KEYWORDS = new Set([
    "and",
    "break",
    "continue",
    "do",
    "else",
    "elseif",
    "end",
    "false",
    "for",
    "function",
    "if",
    "in",
    "local",
    "nil",
    "not",
    "or",
    "repeat",
    "return",
    "then",
    "true",
    "until",
    "while",
    "typeof",
  ])
  const GLOBALS = new Set([
    "game",
    "workspace",
    "script",
    "self",
    "tick",
    "os",
    "task",
    "math",
    "string",
    "table",
    "pcall",
    "tostring",
    "tonumber",
    "ipairs",
    "pairs",
    "print",
    "warn",
    "typeof",
    "loadstring",
    "HttpService",
    "Players",
    "DataStoreService",
    "Lighting",
    "Chat",
    "Stats",
    "CFrame",
    "Vector3",
    "Enum",
  ])

  // Protège les chaînes puis les commentaires en segmentant
  const tokens: { t: string; v: string }[] = []
  let i = 0
  const push = (t: string, v: string) => v.length && tokens.push({ t, v })

  while (i < code.length) {
    // Commentaires de bloc --[[ ]]
    if (code.slice(i, i + 4) === "--[[") {
      const end = code.indexOf("]]", i)
      const stop = end === -1 ? code.length : end + 2
      push("comment", code.slice(i, stop))
      i = stop
      continue
    }
    // Commentaire ligne --
    if (code.slice(i, i + 2) === "--") {
      let j = i
      while (j < code.length && code[j] !== "\n") j++
      push("comment", code.slice(i, j))
      i = j
      continue
    }
    // Chaîne " ou '
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i]
      let j = i + 1
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2
          continue
        }
        if (code[j] === quote) {
          j++
          break
        }
        if (code[j] === "\n") break
        j++
      }
      push("string", code.slice(i, j))
      i = j
      continue
    }
    // Nombre
    if (/[0-9]/.test(code[i])) {
      let j = i
      while (j < code.length && /[0-9.]/.test(code[j])) j++
      push("number", code.slice(i, j))
      i = j
      continue
    }
    // Identifier
    if (/[A-Za-z_]/.test(code[i])) {
      let j = i
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++
      const word = code.slice(i, j)
      if (KEYWORDS.has(word)) push("keyword", word)
      else if (GLOBALS.has(word)) push("global", word)
      else push("ident", word)
      i = j
      continue
    }
    push("plain", code[i])
    i++
  }

  return tokens
}

const tokenClass: Record<string, string> = {
  keyword: "text-[#c5a3ff] font-medium",
  string: "text-[#9ce7ff]",
  comment: "text-muted-foreground/60 italic",
  number: "text-[#ffd39a]",
  global: "text-[#7dd3fc]",
  ident: "text-foreground/85",
  plain: "text-foreground/70",
}

export function IntegrationView() {
  const [apiBase, setApiBase] = useState("")
  const [serverKey, setServerKey] = useState("")

  // Détecte l'URL publique au chargement
  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiBase(window.location.origin)
    }
  }, [])

  // Génère une clé forte si vide
  useEffect(() => {
    if (!serverKey && typeof window !== "undefined") {
      const bytes = new Uint8Array(24)
      window.crypto.getRandomValues(bytes)
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      setServerKey(`sk_live_${hex}`)
    }
  }, [serverKey])

  const scriptUrl = useMemo(() => {
    if (!apiBase) return null
    const p = new URLSearchParams()
    p.set("apiBase", apiBase)
    if (serverKey) p.set("key", serverKey)
    return `/api/roblox-script?${p.toString()}`
  }, [apiBase, serverKey])

  const { data, isLoading, mutate } = useSWR(scriptUrl, fetcher, {
    revalidateOnFocus: false,
  })

  const script = data?.script ?? ""
  const lineCount = script ? script.split("\n").length : 0
  const sizeKb = script ? (new Blob([script]).size / 1024).toFixed(1) : "0"

  const [copied, setCopied] = useState(false)

  async function copyScript() {
    if (!script) return
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      toast.success("Script copié", {
        description: `${lineCount} lignes · ${sizeKb} Ko. Colle-le dans ServerScriptService.`,
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Impossible de copier le script")
    }
  }

  function downloadScript() {
    if (!scriptUrl) return
    const url = scriptUrl + "&format=lua"
    const a = document.createElement("a")
    a.href = url
    a.download = "SkydrivePanelServer.server.lua"
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast.success("Téléchargement lancé", {
      description: "SkydrivePanelServer.server.lua",
    })
  }

  function regenerateKey() {
    const bytes = new Uint8Array(24)
    window.crypto.getRandomValues(bytes)
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    setServerKey(`sk_live_${hex}`)
    toast.info("Nouvelle clé générée", {
      description: "Pense à re-copier le script pour l'utiliser.",
    })
  }

  const highlighted = useMemo(() => highlightLua(script), [script])

  return (
    <div className="flex flex-col gap-6 h-full overflow-auto custom-scrollbar pr-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Intégration Roblox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Copie le script Luau dans ton jeu pour connecter Skydrive Panel.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode className="h-4 w-4 text-primary" />
          <span className="font-mono">
            {lineCount} lignes · {sizeKb} Ko
          </span>
        </div>
      </div>

      {/* Configuration */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Configuration
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="apiBase"
              className="text-xs text-muted-foreground flex items-center gap-1.5"
            >
              <Globe2 className="h-3 w-3" />
              URL du Panel (API_BASE)
            </Label>
            <Input
              id="apiBase"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://mon-panel.vercel.app"
              className="font-mono text-xs bg-white/5 border-white/10 focus-visible:border-primary/50"
            />
            <p className="text-[11px] text-muted-foreground/80">
              Détecté automatiquement. Met l&apos;URL publique de déploiement.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="serverKey"
              className="text-xs text-muted-foreground flex items-center gap-1.5"
            >
              <KeyRound className="h-3 w-3" />
              Clé serveur (SERVER_KEY)
            </Label>
            <div className="flex gap-2">
              <Input
                id="serverKey"
                value={serverKey}
                onChange={(e) => setServerKey(e.target.value)}
                placeholder="sk_live_..."
                className="font-mono text-xs bg-white/5 border-white/10 focus-visible:border-primary/50"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerateKey}
                title="Régénérer"
                className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              À configurer aussi côté serveur (variable{" "}
              <code className="text-foreground/80">SKYDRIVE_SERVER_KEY</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Installation
          </h2>
        </div>
        <ol className="space-y-3 text-sm text-muted-foreground">
          {[
            {
              t: "Active les APIs dans Roblox Studio",
              d: (
                <>
                  <span className="text-foreground/90">Game Settings &gt; Security</span>{" "}
                  — active <code className="text-primary">HttpEnabled</code>,{" "}
                  <code className="text-primary">LoadStringEnabled</code> et{" "}
                  <code className="text-primary">StudioAccessToApis</code>.
                </>
              ),
            },
            {
              t: "Copie le script ci-dessous",
              d: (
                <>
                  L&apos;URL et la clé sont déjà injectées. Colle-le dans{" "}
                  <code className="text-primary">ServerScriptService</code> sous le nom{" "}
                  <code className="text-primary">SkydrivePanelServer</code> (type Script).
                </>
              ),
            },
            {
              t: "Lance une session Play",
              d: (
                <>
                  Le panel passera en <span className="text-green-400">Live</span> dans les
                  3 secondes et recevra joueurs, ping et logs en temps réel.
                </>
              ),
            },
          ].map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <div className="shrink-0 h-6 w-6 rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 border border-white/10 text-xs font-semibold flex items-center justify-center text-foreground">
                {idx + 1}
              </div>
              <div className="pt-0.5">
                <div className="text-foreground/90 font-medium mb-0.5">{step.t}</div>
                <div className="text-[13px] leading-relaxed">{step.d}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Code block */}
      <div className="glass rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <LinkIcon className="h-3 w-3" />
              ServerScriptService / SkydrivePanelServer.lua
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-xs gap-1.5"
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Rafraîchir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadScript}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </Button>
            <Button
              size="sm"
              onClick={copyScript}
              disabled={!script}
              className={cn(
                "text-xs gap-1.5 border border-white/10 transition-all",
                copied
                  ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                  : "bg-gradient-to-r from-primary/40 to-accent/30 hover:from-primary/50 hover:to-accent/40 text-foreground glow-primary",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copier le script
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="relative max-h-[60vh] overflow-auto custom-scrollbar">
          {isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Chargement du script…
            </div>
          )}
          {!isLoading && script && (
            <pre className="text-[12px] leading-[1.55] font-mono p-5 whitespace-pre">
              <code>
                {highlighted.map((tok, i) => (
                  <span key={i} className={tokenClass[tok.t] ?? tokenClass.plain}>
                    {tok.v}
                  </span>
                ))}
              </code>
            </pre>
          )}
          {!isLoading && !script && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Impossible de charger le script.
            </div>
          )}
        </div>
      </div>

      {/* API reference */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-accent" />
          Endpoints utilisés
        </h2>
        <div className="grid md:grid-cols-2 gap-2 text-xs font-mono">
          {[
            ["POST", "/api/heartbeat", "Joueurs + logs, reçoit commandes"],
            ["POST", "/api/commands/ack", "Acknowledgement commandes"],
            ["POST", "/api/logs", "Stream de logs (chat, erreurs)"],
            ["POST", "/api/economy", "Sync bulk argent joueurs"],
            ["GET", "/api/world", "État monde persisté"],
            ["GET", "/api/triggers", "Règles Si / Alors persistées"],
          ].map(([m, p, d]) => (
            <div
              key={p}
              className="flex items-center gap-3 glass-subtle rounded-xl px-3 py-2.5"
            >
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  m === "GET"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-primary/20 text-primary",
                )}
              >
                {m}
              </span>
              <span className="text-foreground/90">{p}</span>
              <span className="ml-auto text-muted-foreground font-sans">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
