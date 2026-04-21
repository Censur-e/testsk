"use client"

import { useMemo } from "react"
import {
  Users,
  Activity,
  Shield,
  ArrowUpRight,
  Zap,
  Server,
  ServerOff,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useCommands, useLogs, usePlayers, useStats } from "@/lib/api"

function fmtUptime(sec: number) {
  if (!sec || sec < 0) return "-"
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h ${m}m`
}

export function DashboardView() {
  const { stats } = useStats()
  const { players } = usePlayers()
  const { commands } = useCommands()
  const { logs } = useLogs(20)

  const chartData = useMemo(() => {
    // Regroupe les commandes par heure
    const now = Date.now()
    const buckets: Record<string, { time: string; actions: number; players: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const h = new Date(now - i * 3600_000).getHours()
      const key = `${String(h).padStart(2, "0")}h`
      buckets[key] = { time: key, actions: 0, players: 0 }
    }
    for (const c of commands) {
      const h = new Date(c.createdAt).getHours()
      const key = `${String(h).padStart(2, "0")}h`
      if (buckets[key]) buckets[key].actions += 1
    }
    const keys = Object.keys(buckets)
    if (keys.length > 0) buckets[keys[keys.length - 1]].players = players.length
    return Object.values(buckets)
  }, [commands, players.length])

  const statsCards = [
    {
      label: "Joueurs connectes",
      value: (stats?.counts.players ?? 0).toString(),
      hint: stats?.server ? `${stats.server.maxPlayers} max` : "-",
      icon: Users,
      color: "from-primary to-accent",
    },
    {
      label: "Commandes (1h)",
      value: (stats?.counts.commandsLastHour ?? 0).toString(),
      hint: "derniere heure",
      icon: Zap,
      color: "from-accent to-cyan-400",
    },
    {
      label: "Bans actifs",
      value: (stats?.counts.bans ?? 0).toString(),
      hint: "persistes en base",
      icon: Shield,
      color: "from-red-500 to-orange-500",
    },
    {
      label: "Uptime",
      value: fmtUptime(stats?.server?.uptime ?? 0),
      hint: stats?.online ? "En ligne" : "Hors ligne",
      icon: stats?.online ? Server : ServerOff,
      color: stats?.online ? "from-emerald-500 to-teal-400" : "from-slate-500 to-slate-600",
    },
  ]

  const recentActivity = logs
    .slice()
    .reverse()
    .slice(0, 5)
    .map((l, i) => ({
      id: l.id ?? i,
      action: l.type === "chat" ? "Chat" : l.type.toUpperCase(),
      text: l.text,
      time: l.time,
      color:
        l.type === "error"
          ? "text-red-400"
          : l.type === "warning"
            ? "text-yellow-400"
            : l.type === "success"
              ? "text-green-400"
              : l.type === "chat"
                ? "text-accent"
                : "text-muted-foreground",
    }))

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d&apos;ensemble en temps reel de votre serveur.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`h-1.5 w-1.5 rounded-full ${stats?.online ? "bg-green-400 pulse-dot" : "bg-orange-400"}`}
          />
          {stats?.online ? "Synchronisation live" : "En attente du heartbeat"}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-white/15 transition-colors"
            >
              <div
                className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</div>
                  <div className="text-3xl font-semibold mt-2 tabular-nums tracking-tight">{s.value}</div>
                  <div className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.hint}
                  </div>
                </div>
                <div
                  className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.color} opacity-80 flex items-center justify-center`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-medium">Activite du serveur</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Commandes executees sur 6 heures</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Joueurs</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-muted-foreground">Actions</span>
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="players" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a884ff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a884ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="actions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5ec8ff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#5ec8ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20, 15, 40, 0.9)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="players" stroke="#a884ff" strokeWidth={2} fill="url(#players)" />
                <Area type="monotone" dataKey="actions" stroke="#5ec8ff" strokeWidth={2} fill="url(#actions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Activite recente</h2>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0"
              >
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider ${a.color} px-2 py-1 rounded-md bg-white/[0.03] border border-white/10 shrink-0`}
                >
                  {a.action}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{a.text}</div>
                </div>
                <div className="text-[10px] text-muted-foreground whitespace-nowrap">{a.time}</div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Aucune activite - en attente du heartbeat
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "CPU Serveur",
            value: Math.round(stats?.server?.cpuUsage ?? 0),
            color: "from-primary to-accent",
          },
          {
            label: "Memoire (MB)",
            value: Math.min(100, Math.round(((stats?.server?.memoryMB ?? 0) / 1024) * 100)),
            color: "from-accent to-cyan-400",
          },
          {
            label: "Ping moyen",
            value: Math.min(100, Math.round(stats?.avgPing ?? 0)),
            color: "from-emerald-500 to-teal-400",
          },
          {
            label: "Triggers actifs",
            value: Math.min(100, (stats?.counts.activeTriggers ?? 0) * 10),
            color: "from-pink-500 to-primary",
          },
        ].map((m) => (
          <div key={m.label} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span className="text-xs font-mono tabular-nums">{m.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all`}
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
