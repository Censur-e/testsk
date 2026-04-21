"use client"

import { useState } from "react"
import type { Player } from "@/lib/types"
import { usePlayers } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Search, Filter, Heart, Shield, Wifi, ChevronRight, Loader2, ServerOff } from "lucide-react"
import { PlayerSlideOver } from "@/components/player-slide-over"

function roleStyles(role: Player["role"]) {
  switch (role) {
    case "Admin":
      return "bg-red-500/15 text-red-300 border-red-500/30"
    case "Mod":
      return "bg-primary/20 text-primary border-primary/30"
    case "VIP":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
    default:
      return "bg-white/5 text-muted-foreground border-white/10"
  }
}

function pingColor(ping: number) {
  if (ping < 50) return "text-green-400"
  if (ping < 150) return "text-yellow-400"
  return "text-red-400"
}

function healthColor(hp: number) {
  if (hp > 70) return "from-green-500 to-emerald-400"
  if (hp > 30) return "from-yellow-500 to-orange-400"
  return "from-red-500 to-orange-500"
}

export function PlayersView() {
  const [selected, setSelected] = useState<Player | null>(null)
  const [query, setQuery] = useState("")
  const { players, isLoading } = usePlayers()

  const filtered = players.filter((p) => p.username.toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Player Hub</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {players.length > 0
                ? `${filtered.length} joueurs connectes - Cliquez pour gerer`
                : "En attente du heartbeat du serveur Roblox..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un joueur..."
                className="glass-subtle rounded-xl pl-9 pr-3 py-2 text-sm w-60 focus:outline-none focus:border-primary/50"
              />
            </div>
            <button className="glass-subtle rounded-xl px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/[0.06] transition-colors">
              <Filter className="h-3.5 w-3.5" />
              Filtrer
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-white/5 bg-white/[0.02]">
            <div className="col-span-4">Joueur</div>
            <div className="col-span-3">Sante / Armure</div>
            <div className="col-span-2">Ping</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-white/[0.03] transition-colors text-left group"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="relative">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-xs font-bold border border-white/10",
                        p.role === "Admin"
                          ? "from-red-500/40 to-orange-500/40"
                          : p.role === "Mod"
                            ? "from-primary/40 to-accent/40"
                            : p.role === "VIP"
                              ? "from-yellow-500/40 to-amber-500/40"
                              : "from-white/10 to-white/5",
                      )}
                    >
                      {p.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        p.ping < 200 ? "bg-green-400" : "bg-orange-400",
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{p.username}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.team} - {p.playtime}
                    </div>
                  </div>
                </div>

                <div className="col-span-3 flex items-center gap-2">
                  <div className="flex-1 space-y-1 max-w-40">
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-3 w-3 text-red-400/80" />
                      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${healthColor(p.health)} rounded-full`}
                          style={{ width: `${p.health}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                        {p.health}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-accent/80" />
                      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-cyan-300 rounded-full"
                          style={{ width: `${p.armor}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                        {p.armor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <Wifi className={cn("h-3.5 w-3.5", pingColor(p.ping))} />
                  <span className={cn("text-sm font-mono tabular-nums", pingColor(p.ping))}>{p.ping}ms</span>
                </div>

                <div className="col-span-2">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border",
                      roleStyles(p.role),
                    )}
                  >
                    {p.role}
                  </span>
                </div>

                <div className="col-span-1 flex justify-end">
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                {isLoading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm">Connexion a l&apos;API...</span>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-2xl glass-subtle flex items-center justify-center">
                      <ServerOff className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground/80">Aucun joueur connecte</div>
                      <div className="text-xs mt-1 max-w-sm">
                        Le script Roblox doit envoyer un heartbeat sur{" "}
                        <code className="font-mono text-accent">POST /api/heartbeat</code> pour remplir cette liste.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <PlayerSlideOver
        player={selected}
        allPlayers={players.filter((p) => p.id !== selected?.id)}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
