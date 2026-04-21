"use client"

import { Search, Bell, ChevronDown, Activity, Radio, WifiOff } from "lucide-react"
import { useStats } from "@/lib/api"
import { cn } from "@/lib/utils"

export function SkydriveHeader() {
  const { stats } = useStats()
  const online = stats?.online ?? false
  const ping = stats?.avgPing ?? 0
  const jobId = stats?.server?.jobId ? stats.server.jobId.slice(0, 6) : "------"

  return (
    <header className="glass rounded-2xl p-3 flex items-center gap-3 relative z-10">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher joueur, commande, script..."
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
        />
        <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* API Status */}
        <div
          className={cn(
            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-subtle transition-colors",
            online ? "" : "bg-orange-500/5 border-orange-500/20",
          )}
        >
          {online ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-xs font-medium text-foreground/90">API Connectee</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-orange-400" />
              <span className="text-xs font-medium text-orange-300">En attente Roblox</span>
            </>
          )}
        </div>

        {/* Ping */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-subtle">
          <Activity className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-mono tabular-nums text-foreground/90">{ping}ms</span>
        </div>

        {/* Server selector */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-subtle hover:bg-white/[0.06] transition-colors group">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <div className="flex flex-col items-start">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">Serveur</span>
            <span className="text-xs font-mono text-foreground/90 leading-tight mt-0.5">#JobId-{jobId}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        <button className="relative h-10 w-10 rounded-xl glass-subtle hover:bg-white/[0.06] transition-colors flex items-center justify-center">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent glow-accent" />
        </button>

        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-white border border-white/10">
          SK
        </div>
      </div>
    </header>
  )
}
