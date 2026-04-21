"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { adjustMoney, sendCommand, useEconomy, usePlayers } from "@/lib/api"
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  PiggyBank,
  Gift,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function EconomyView() {
  const { economy, isLoading } = useEconomy()
  const { players } = usePlayers()
  const [amount, setAmount] = useState("1000")
  const [target, setTarget] = useState("all")

  const totalBalance = economy.reduce((s, e) => s + e.balance, 0)
  const totalEarned = economy.reduce((s, e) => s + e.totalEarned, 0)
  const totalSpent = economy.reduce((s, e) => s + e.totalSpent, 0)

  // Derive un graphique simple a partir de l'economie reelle
  const chartData = useMemo(() => {
    if (economy.length === 0) return []
    // Buckets fictifs deriver depuis les donnees reelles pour visualisation
    const sorted = [...economy].sort((a, b) => a.updatedAt - b.updatedAt)
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    return days.map((d, i) => ({
      day: d,
      injected: Math.round((sorted[i % sorted.length]?.totalEarned ?? 0) / 7),
      removed: Math.round((sorted[i % sorted.length]?.totalSpent ?? 0) / 7),
    }))
  }, [economy])

  const handleInject = async () => {
    const amt = parseInt(amount) || 0
    if (amt === 0) {
      toast.error("Montant invalide")
      return
    }

    try {
      if (target === "all") {
        // Broadcast: injection globale via commande set_money ciblant *
        await sendCommand("set_money", {
          targetId: "*",
          payload: { delta: amt, reason: "Injection globale (Panel)" },
          issuedBy: "Panel",
        })
        toast.success(`$${amt.toLocaleString("fr-FR")} injectes a tous`, {
          description: "Commande envoyee au serveur Roblox.",
        })
      } else {
        const player = players.find((p) => p.username === target)
        if (!player) {
          toast.error("Joueur introuvable")
          return
        }
        await adjustMoney(player.id, player.username, amt, "Injection (Panel)")
        toast.success(`$${amt.toLocaleString("fr-FR")} injectes`, {
          description: `Vers ${target}.`,
        })
      }
    } catch {
      toast.error("Echec du transfert")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Economie</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerez la monnaie virtuelle - persistee cote API (a synchroniser avec DataStore Roblox).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Coins,
            label: "Balance totale",
            value: `$${totalBalance.toLocaleString("fr-FR")}`,
            hint: `${economy.length} comptes`,
            color: "from-yellow-500 to-orange-500",
          },
          {
            icon: TrendingUp,
            label: "Total gagne",
            value: `$${totalEarned.toLocaleString("fr-FR")}`,
            hint: "cumul historique",
            color: "from-green-500 to-emerald-400",
          },
          {
            icon: TrendingDown,
            label: "Total depense",
            value: `$${totalSpent.toLocaleString("fr-FR")}`,
            hint: "cumul historique",
            color: "from-red-500 to-orange-500",
          },
          {
            icon: ArrowRightLeft,
            label: "Joueurs en ligne",
            value: players.length.toString(),
            hint: "avec economie active",
            color: "from-primary to-accent",
          },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="glass rounded-2xl p-5 relative overflow-hidden">
              <div
                className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.color} opacity-10 blur-2xl`}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{s.label}</span>
                  <div
                    className={`h-8 w-8 rounded-lg bg-gradient-to-br ${s.color} opacity-80 flex items-center justify-center`}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-semibold mt-2 tabular-nums">{s.value}</div>
                <div className="text-xs mt-1 text-muted-foreground">{s.hint}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-medium">Flux economique</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Injections vs retraits</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Injecte</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-muted-foreground">Retire</span>
              </span>
            </div>
          </div>
          <div className="h-72">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Wallet className="h-8 w-8 opacity-30" />
                    <span className="text-sm">Aucune donnee economique</span>
                    <span className="text-xs">
                      Le serveur doit envoyer via <code className="text-accent">POST /api/economy</code>
                    </span>
                  </>
                )}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={6}>
                  <defs>
                    <linearGradient id="bInj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a884ff" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#a884ff" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="bRem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5ec8ff" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#5ec8ff" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20, 15, 40, 0.9)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="injected" fill="url(#bInj)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="removed" fill="url(#bRem)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick transfer */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Send className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-medium">Transfert rapide</h2>
              <p className="text-xs text-muted-foreground">Injecter de l&apos;argent</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Destinataire
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1.5 w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="all" className="bg-background">
                  Tous les joueurs
                </option>
                {players.map((p) => (
                  <option key={p.id} value={p.username} className="bg-background">
                    {p.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Montant</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50 font-mono"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {["100", "1000", "10000", "100000"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="flex-1 text-[11px] py-1 rounded-lg glass-subtle hover:bg-white/[0.06] transition-colors"
                  >
                    ${parseInt(v).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleInject}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium text-sm hover:opacity-90 transition-opacity glow-primary"
            >
              Injecter l&apos;argent
            </button>

            <div className="pt-3 border-t border-white/5 space-y-2">
              {[
                {
                  icon: Gift,
                  label: "Distribuer kit",
                  desc: "Kit de depart a tous",
                  run: () =>
                    sendCommand("broadcast", {
                      targetId: "*",
                      payload: { action: "kit_starter" },
                      issuedBy: "Panel",
                    }),
                },
                {
                  icon: Sparkles,
                  label: "Bonus journalier",
                  desc: "$500 a chaque joueur",
                  run: () =>
                    sendCommand("set_money", {
                      targetId: "*",
                      payload: { delta: 500, reason: "Bonus journalier" },
                      issuedBy: "Panel",
                    }),
                },
                {
                  icon: PiggyBank,
                  label: "Taxe globale -10%",
                  desc: "Retire 10% a tous",
                  run: () =>
                    sendCommand("set_money", {
                      targetId: "*",
                      payload: { multiplier: 0.9, reason: "Taxe globale" },
                      issuedBy: "Panel",
                    }),
                },
              ].map((a) => {
                const Icon = a.icon
                return (
                  <button
                    key={a.label}
                    onClick={async () => {
                      try {
                        await a.run()
                        toast.success(a.label, { description: a.desc })
                      } catch {
                        toast.error("Echec de la commande")
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl glass-subtle hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-xs font-medium">{a.label}</div>
                      <div className="text-[10px] text-muted-foreground">{a.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-medium">Classement des plus riches</h2>
              <p className="text-xs text-muted-foreground">Top 10 des comptes</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {economy.slice(0, 10).map((p, i) => (
            <div
              key={p.userId}
              className="flex items-center gap-4 p-3 rounded-xl glass-subtle hover:bg-white/[0.05] transition-colors"
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold tabular-nums ${
                  i === 0
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                    : i === 1
                      ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900"
                      : i === 2
                        ? "bg-gradient-to-br from-orange-600 to-amber-700 text-white"
                        : "bg-white/5 text-muted-foreground"
                }`}
              >
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{p.username}</div>
                <div className="text-[11px] text-muted-foreground">id: {p.userId}</div>
              </div>
              <div className="text-right">
                <div className="font-mono tabular-nums text-sm font-semibold">
                  ${p.balance.toLocaleString("fr-FR")}
                </div>
                <div className="text-[10px] text-green-400">
                  +${p.totalEarned.toLocaleString("fr-FR")} cumul
                </div>
              </div>
            </div>
          ))}

          {economy.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <Wallet className="h-8 w-8 opacity-30 mx-auto mb-2" />
              <div className="text-sm">Aucun compte enregistre</div>
              <div className="text-xs mt-1">Les economies sont synchronisees depuis le DataStore Roblox.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
