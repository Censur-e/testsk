"use client"

import { useEffect, useState } from "react"
import type { Player, CommandKind } from "@/lib/types"
import { banPlayer, sendCommand } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  X,
  MapPin,
  DollarSign,
  Package,
  UserX,
  Ban,
  AlertTriangle,
  MicOff,
  Snowflake,
  Eye,
  Heart,
  Skull,
  Users2,
  MessageSquareQuote,
  Copy,
  Trash2,
  Radio,
  Shield,
} from "lucide-react"

type Props = {
  player: Player | null
  onClose: () => void
}

type QuickAction = {
  key: string
  label: string
  icon: React.ElementType
  color: string
  bg: string
  border: string
  kind: CommandKind
}

const quickActions: QuickAction[] = [
  { key: "kick", label: "Kick", icon: UserX, color: "text-orange-400", bg: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/20", kind: "kick" },
  { key: "ban", label: "Ban", icon: Ban, color: "text-red-400", bg: "from-red-500/20 to-red-500/5", border: "border-red-500/20", kind: "ban" },
  { key: "warn", label: "Warn", icon: AlertTriangle, color: "text-yellow-400", bg: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/20", kind: "warn" },
  { key: "mute", label: "Mute", icon: MicOff, color: "text-pink-400", bg: "from-pink-500/20 to-pink-500/5", border: "border-pink-500/20", kind: "mute" },
  { key: "freeze", label: "Freeze", icon: Snowflake, color: "text-cyan-300", bg: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/20", kind: "freeze" },
  { key: "spectate", label: "Spectate", icon: Eye, color: "text-accent", bg: "from-accent/20 to-accent/5", border: "border-accent/20", kind: "spectate" },
  { key: "heal", label: "Heal", icon: Heart, color: "text-green-400", bg: "from-green-500/20 to-green-500/5", border: "border-green-500/20", kind: "heal" },
  { key: "kill", label: "Tuer", icon: Skull, color: "text-red-500", bg: "from-red-600/20 to-red-600/5", border: "border-red-600/20", kind: "kill" },
]

type AdvancedAction = {
  key: string
  label: string
  icon: React.ElementType
  kind: CommandKind
  payload?: Record<string, unknown>
}

const advancedActions: AdvancedAction[] = [
  { key: "team", label: "Changer d'equipe", icon: Users2, kind: "set_team", payload: { team: "random" } },
  { key: "force-chat", label: "Forcer a parler", icon: MessageSquareQuote, kind: "force_chat", payload: { message: "Bonjour !" } },
  { key: "clone", label: "Cloner le joueur", icon: Copy, kind: "clone" },
  { key: "wipe", label: "Wipe inventaire", icon: Trash2, kind: "wipe_inventory" },
  { key: "tp-me", label: "Teleporter a moi", icon: Radio, kind: "teleport_to_me" },
]

const actionLabels: Partial<Record<CommandKind, string>> = {
  kick: "a ete kick",
  ban: "a ete banni",
  warn: "a recu un warn",
  mute: "a ete mute",
  freeze: "a ete fige",
  spectate: "est maintenant spectate",
  heal: "a ete soigne",
  kill: "a ete tue",
  set_team: "a change d'equipe",
  force_chat: "va parler",
  clone: "a ete clone",
  wipe_inventory: "a un inventaire vide",
  teleport_to_me: "a ete teleporte",
}

export function PlayerSlideOver({ player, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    if (player) {
      setMounted(true)
      setBanReason("")
    }
  }, [player])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleAction = async (kind: CommandKind, label: string, payload?: Record<string, unknown>) => {
    if (!player) return
    setSending(kind)
    try {
      if (kind === "ban") {
        await banPlayer(player.id, player.username, banReason || "Aucune raison")
      } else {
        await sendCommand(kind, {
          targetId: player.id,
          payload: kind === "ban" ? { reason: banReason } : payload,
          issuedBy: "Panel",
        })
      }
      const suffix = actionLabels[kind] ?? label
      toast.success(`${player.username} ${suffix}`, {
        description:
          kind === "ban" && banReason
            ? `Raison : ${banReason}`
            : "Commande envoyee - executee au prochain heartbeat.",
      })
    } catch (err) {
      toast.error("Echec de la commande", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      })
    } finally {
      setSending(null)
    }
  }

  if (!player && !mounted) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          player ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Slide-over panel */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full max-w-md transition-transform duration-300 ease-out",
          player ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="h-full m-0 lg:m-4 glass-strong rounded-none lg:rounded-2xl overflow-hidden flex flex-col shadow-[0_0_60px_-10px_rgba(168,132,255,0.3)]">
          {player && (
            <>
              {/* Header */}
              <div className="relative p-5 border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  <div className="relative">
                    <div
                      className={cn(
                        "h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-lg font-bold border border-white/10 glow-primary",
                        player.role === "Admin"
                          ? "from-red-500/40 to-orange-500/40"
                          : player.role === "Mod"
                            ? "from-primary/40 to-accent/40"
                            : player.role === "VIP"
                              ? "from-yellow-500/40 to-amber-500/40"
                              : "from-white/10 to-white/5",
                      )}
                    >
                      {player.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-background pulse-dot" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight truncate">{player.username}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">
                        {player.role}
                      </span>
                      <span className="text-xs text-muted-foreground">{player.team}</span>
                      <span className="text-xs text-muted-foreground">-</span>
                      <span className="text-xs text-muted-foreground font-mono">{player.ping}ms</span>
                      <span className="text-xs text-muted-foreground">-</span>
                      <span className="text-xs text-muted-foreground font-mono">id:{player.id}</span>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors flex items-center justify-center"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-5 space-y-5">
                  {/* Live stats */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                      Statistiques en direct
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <StatBox
                        icon={<Heart className="h-3.5 w-3.5 text-red-400" />}
                        label="Sante"
                        value={`${player.health}%`}
                      />
                      <StatBox
                        icon={<Shield className="h-3.5 w-3.5 text-accent" />}
                        label="Armure"
                        value={`${player.armor}%`}
                      />
                      <StatBox
                        icon={<DollarSign className="h-3.5 w-3.5 text-green-400" />}
                        label="Argent"
                        value={`$${player.money.toLocaleString("fr-FR")}`}
                      />
                      <StatBox
                        icon={<Skull className="h-3.5 w-3.5 text-muted-foreground" />}
                        label="K / D"
                        value={`${player.kills} / ${player.deaths}`}
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div className="glass-subtle rounded-xl p-3">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                      <MapPin className="h-3 w-3" />
                      Position
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["x", "y", "z"] as const).map((axis) => (
                        <div key={axis} className="bg-white/[0.03] rounded-lg px-2 py-1.5 border border-white/5">
                          <div className="text-[9px] uppercase text-muted-foreground">{axis}</div>
                          <div className="font-mono text-xs tabular-nums">{player.position[axis].toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items */}
                  {player.items.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                        <Package className="h-3 w-3" />
                        Inventaire equipe
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {player.items.map((item) => (
                          <span
                            key={item}
                            className="text-xs px-2.5 py-1 rounded-lg glass-subtle hover:bg-white/[0.06] transition-colors"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ban reason field */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Raison (pour ban)
                    </label>
                    <input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Ex: Comportement abusif, cheat..."
                      className="mt-1.5 w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {/* Quick actions */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                      Actions rapides
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {quickActions.map((action) => {
                        const Icon = action.icon
                        const isSending = sending === action.kind
                        return (
                          <button
                            key={action.key}
                            disabled={isSending}
                            onClick={() => handleAction(action.kind, action.label)}
                            className={cn(
                              "group flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-gradient-to-b border transition-all hover:scale-[1.03] hover:border-white/20 disabled:opacity-50",
                              action.bg,
                              action.border,
                            )}
                          >
                            <Icon className={cn("h-4 w-4", action.color, isSending && "animate-pulse")} />
                            <span className="text-[10px] font-medium">{action.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Advanced actions */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                      Actions avancees
                    </div>
                    <div className="space-y-1.5">
                      {advancedActions.map((action) => {
                        const Icon = action.icon
                        const isSending = sending === action.kind
                        return (
                          <button
                            key={action.key}
                            disabled={isSending}
                            onClick={() => handleAction(action.kind, action.label, action.payload)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl glass-subtle hover:bg-white/[0.06] hover:border-white/15 transition-all text-left group disabled:opacity-50"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-sm flex-1">{action.label}</span>
                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              {"->"}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="glass-subtle rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  )
}
