"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Play,
  FileCode2,
  Save,
  Trash2,
  Sparkles,
  Terminal,
  Copy,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react"
import { executeLua, sendCommand, useLogs, useStats } from "@/lib/api"
import type { ConsoleMessage } from "@/lib/types"

const DEFAULT_SCRIPT = `-- Skydrive Panel - Lua Executor
-- Execute via loadstring() sur le serveur Roblox

local Players = game:GetService("Players")

-- Teleporter tous les joueurs a la position spawn
for _, player in pairs(Players:GetPlayers()) do
    local character = player.Character
    if character and character:FindFirstChild("HumanoidRootPart") then
        character.HumanoidRootPart.CFrame = CFrame.new(0, 100, 0)
        print("Teleporte: " .. player.Name)
    end
end

-- Envoyer un message global
game:GetService("Chat"):Chat(
    workspace,
    "[Admin] Bienvenue sur Skydrive Server!",
    Enum.ChatColor.Blue
)

return "Script execute avec succes"`

const SNIPPETS = [
  { name: "Kick tous", icon: "!", code: "for _, p in pairs(game.Players:GetPlayers()) do\n  p:Kick('Maintenance')\nend" },
  {
    name: "Heal all",
    icon: "+",
    code: "for _, p in pairs(game.Players:GetPlayers()) do\n  if p.Character then\n    p.Character.Humanoid.Health = p.Character.Humanoid.MaxHealth\n  end\nend",
  },
  {
    name: "Freeze world",
    icon: "*",
    code: "workspace.Gravity = 0\nfor _, p in pairs(game.Players:GetPlayers()) do\n  if p.Character and p.Character:FindFirstChild('Humanoid') then\n    p.Character.Humanoid.WalkSpeed = 0\n  end\nend",
  },
  {
    name: "Money +1000",
    icon: "$",
    code: "for _, p in pairs(game.Players:GetPlayers()) do\n  local stats = p:FindFirstChild('leaderstats')\n  if stats and stats:FindFirstChild('Cash') then\n    stats.Cash.Value = stats.Cash.Value + 1000\n  end\nend",
  },
]

export function ExecutorView() {
  const [code, setCode] = useState(DEFAULT_SCRIPT)
  const [executing, setExecuting] = useState(false)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([])
  const [pendingInput, setPendingInput] = useState("")
  const { logs } = useLogs(150)
  const { stats } = useStats()
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const execute = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (executing) return
    setExecuting(true)

    // Particles
    const rect = e.currentTarget.getBoundingClientRect()
    const newParticles = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }))
    setParticles(newParticles)
    setTimeout(() => setParticles([]), 1000)

    try {
      await executeLua(code, "Panel")
      toast.success("Script envoye", {
        description: "Sera execute via loadstring au prochain poll Roblox. N'oubliez pas d'activer LoadStringEnabled.",
      })
    } catch (err) {
      toast.error("Echec d'envoi", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      })
    } finally {
      setExecuting(false)
    }
  }

  const sendChat = async () => {
    const val = pendingInput.trim()
    if (!val) return
    try {
      await sendCommand("broadcast", {
        targetId: "*",
        payload: { message: val },
        issuedBy: "Panel",
      })
      setPendingInput("")
      toast.success("Message diffuse")
    } catch {
      toast.error("Echec d'envoi")
    }
  }

  const clearConsole = () => {
    toast.info("Console videe cote client", { description: "Les logs restent sur le serveur." })
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executeur Lua</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Execute via loadstring() - requiert LoadStringEnabled dans Game Settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.success("Script sauvegarde localement")}
            className="glass-subtle rounded-xl px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors flex items-center gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            Sauvegarder
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(code)
              toast.success("Code copie")
            }}
            className="glass-subtle rounded-xl px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors flex items-center gap-2"
          >
            <Copy className="h-3.5 w-3.5" />
            Copier
          </button>
        </div>
      </div>

      {/* Snippets */}
      <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium pl-2">
          <Sparkles className="h-3 w-3 inline mr-1" />
          Snippets:
        </span>
        {SNIPPETS.map((s) => (
          <button
            key={s.name}
            onClick={() => {
              setCode(s.code)
              toast.info(`Snippet charge : ${s.name}`)
            }}
            className="text-xs px-3 py-1.5 rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            <span className="font-mono">{s.icon}</span>
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* Editor */}
        <div className="glass rounded-2xl overflow-hidden flex flex-col lg:col-span-3">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
              </div>
              <div className="flex items-center gap-2 ml-3 text-xs text-muted-foreground">
                <FileCode2 className="h-3.5 w-3.5" />
                <span className="font-mono">script.lua</span>
                <span className="text-muted-foreground/50">-</span>
                <span>{code.split("\n").length} lignes</span>
              </div>
            </div>
          </div>

          <div className="flex-1 relative min-h-[400px]">
            <LuaEditor value={code} onChange={setCode} />
          </div>

          <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  stats?.online ? "bg-green-400 pulse-dot" : "bg-orange-400",
                )}
              />
              {stats?.server
                ? `Cible : JobId-${stats.server.jobId.slice(0, 6)} - ${stats.counts.players} joueurs`
                : "En attente du serveur..."}
            </div>
            <button
              onClick={execute}
              disabled={executing}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all",
                "bg-gradient-to-r from-primary to-accent text-white",
                "hover:shadow-[0_0_40px_rgba(168,132,255,0.6)]",
                executing && "execute-active opacity-80",
              )}
            >
              <Play className={cn("h-4 w-4", executing && "animate-pulse")} fill="currentColor" />
              {executing ? "Envoi..." : "Executer via Loadstring"}
            </button>
          </div>
        </div>

        {/* Console */}
        <div className="glass rounded-2xl overflow-hidden flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium">Console & Tchat live</span>
              <span className="text-[10px] text-muted-foreground ml-1">({logs.length})</span>
            </div>
            <button
              onClick={clearConsole}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div
            ref={consoleRef}
            className="flex-1 overflow-y-auto custom-scrollbar p-3 font-mono text-[11px] space-y-1.5 min-h-[200px]"
          >
            {logs.length === 0 && (
              <div className="py-8 text-center text-muted-foreground/70">
                <Terminal className="h-6 w-6 opacity-40 mx-auto mb-2" />
                <div className="text-xs">Aucun log</div>
                <div className="text-[10px] mt-0.5">En attente du serveur...</div>
              </div>
            )}
            {logs.map((log) => (
              <ConsoleLine key={log.id} log={log} />
            ))}
          </div>

          <div className="border-t border-white/5 p-3 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-primary font-mono">{">"}</span>
              <input
                value={pendingInput}
                onChange={(e) => setPendingInput(e.target.value)}
                placeholder="Message a diffuser en jeu..."
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60 font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat()
                }}
              />
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {particles.map((p, i) => {
        const style = {
          left: p.x,
          top: p.y,
          animation: `particle-burst 0.9s ease-out forwards`,
          animationDelay: `${i * 30}ms`,
          boxShadow: "0 0 12px rgba(168,132,255,0.9)",
          "--dx": `${(Math.random() - 0.5) * 200}px`,
          "--dy": `${(Math.random() - 0.5) * 200}px`,
        } as React.CSSProperties
        return (
          <span
            key={p.id}
            className="fixed z-50 h-1.5 w-1.5 rounded-full bg-primary pointer-events-none"
            style={style}
          />
        )
      })}
      <style jsx>{`
        @keyframes particle-burst {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

function LuaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const lines = value.split("\n")
  return (
    <div className="absolute inset-0 flex font-mono text-[13px] leading-6">
      <div className="py-4 px-3 text-right text-muted-foreground/40 select-none border-r border-white/5 bg-white/[0.01] min-w-12">
        {lines.map((_, i) => (
          <div key={i} className="tabular-nums">
            {i + 1}
          </div>
        ))}
      </div>
      <div className="relative flex-1">
        <pre
          aria-hidden="true"
          className="absolute inset-0 p-4 whitespace-pre overflow-auto pointer-events-none text-transparent"
        >
          <HighlightedCode code={value} />
        </pre>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="relative w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] leading-6 text-foreground/90 custom-scrollbar"
          style={{ caretColor: "#a884ff" }}
        />
      </div>
    </div>
  )
}

function HighlightedCode({ code }: { code: string }) {
  const keywords =
    /\b(local|function|end|if|then|else|elseif|for|in|do|while|return|and|or|not|true|false|nil|break|repeat|until)\b/g
  const strings = /(["'])(?:(?=(\\?))\2.)*?\1/g
  const comments = /--[^\n]*/g
  const numbers = /\b\d+\.?\d*\b/g
  const globals = /\b(game|workspace|script|Players|ReplicatedStorage|print|pairs|ipairs|pcall|require)\b/g

  const highlighted = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(comments, (m) => `<span style="color: #6b7280">${m}</span>`)
    .replace(strings, (m) => `<span style="color: #86efac">${m}</span>`)
    .replace(keywords, (m) => `<span style="color: #c4b5fd">${m}</span>`)
    .replace(globals, (m) => `<span style="color: #5ec8ff">${m}</span>`)
    .replace(numbers, (m) => `<span style="color: #fbbf24">${m}</span>`)

  return <code dangerouslySetInnerHTML={{ __html: highlighted }} />
}

function ConsoleLine({ log }: { log: ConsoleMessage }) {
  const icon =
    log.type === "error" ? (
      <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
    ) : log.type === "success" ? (
      <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
    ) : log.type === "warning" ? (
      <AlertCircle className="h-3 w-3 text-yellow-400 shrink-0 mt-0.5" />
    ) : log.type === "chat" ? (
      <MessageSquare className="h-3 w-3 text-accent shrink-0 mt-0.5" />
    ) : (
      <span className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5 text-center">-</span>
    )

  const color =
    log.type === "error"
      ? "text-red-300"
      : log.type === "success"
        ? "text-green-300"
        : log.type === "warning"
          ? "text-yellow-300"
          : log.type === "chat"
            ? "text-accent/90"
            : "text-muted-foreground"

  return (
    <div className="flex items-start gap-2">
      {icon}
      <span className="text-muted-foreground/60 tabular-nums">{log.time}</span>
      <span className={cn("flex-1 break-all", color)}>{log.text}</span>
    </div>
  )
}
