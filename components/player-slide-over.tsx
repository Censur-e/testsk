"use client"

import { useEffect, useState } from "react"
import type { Player, CommandKind } from "@/lib/types"
import { banPlayer, sendCommand, adjustMoney } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PromptDialog, type PromptField } from "@/components/prompt-dialog"
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
  Heart,
  Skull,
  Users2,
  MessageSquareQuote,
  Copy,
  Trash2,
  Radio,
  Shield,
  ShieldOff,
  Crosshair,
  Zap,
  RotateCcw,
  Gift,
  Trophy,
  Crown,
  Clock,
  Target,
  Timer,
  Mail,
  Sparkles,
} from "lucide-react"

type Props = {
  player: Player | null
  allPlayers?: Player[]
  onClose: () => void
}

// ---------- Actions rapides (grille de boutons colores) ----------
type QuickAction = {
  key: string
  label: string
  icon: React.ElementType
  color: string
  bg: string
  border: string
  kind: CommandKind
  requiresReason?: boolean
  danger?: boolean
}

const quickActions: QuickAction[] = [
  { key: "kick", label: "Kick", icon: UserX, color: "text-orange-400", bg: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/20", kind: "kick", requiresReason: true },
  { key: "ban", label: "Ban", icon: Ban, color: "text-red-400", bg: "from-red-500/20 to-red-500/5", border: "border-red-500/20", kind: "ban", requiresReason: true, danger: true },
  { key: "warn", label: "Avertir", icon: AlertTriangle, color: "text-yellow-400", bg: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/20", kind: "warn", requiresReason: true },
  { key: "mute", label: "Mute", icon: MicOff, color: "text-pink-400", bg: "from-pink-500/20 to-pink-500/5", border: "border-pink-500/20", kind: "mute", requiresReason: true },
  { key: "freeze", label: "Figer", icon: Snowflake, color: "text-cyan-300", bg: "from-cyan-500/20 to-cyan-500/5", border: "border-cyan-500/20", kind: "freeze" },
  { key: "heal", label: "Soigner", icon: Heart, color: "text-green-400", bg: "from-green-500/20 to-green-500/5", border: "border-green-500/20", kind: "heal" },
  { key: "kill", label: "Tuer", icon: Skull, color: "text-red-500", bg: "from-red-600/20 to-red-600/5", border: "border-red-600/20", kind: "kill" },
  { key: "remove-armor", label: "Retirer bouclier", icon: ShieldOff, color: "text-slate-300", bg: "from-slate-500/20 to-slate-500/5", border: "border-slate-500/20", kind: "remove_armor" },
]

// ---------- Actions avancees (liste verticale) ----------
type AdvancedActionStatic = {
  kind: "static"
  key: string
  label: string
  icon: React.ElementType
  commandKind: CommandKind
  payload?: Record<string, unknown>
}

type AdvancedActionPrompt = {
  kind: "prompt"
  key: string
  label: string
  icon: React.ElementType
  promptKey: string
}

type AdvancedAction = AdvancedActionStatic | AdvancedActionPrompt

const advancedActions: AdvancedAction[] = [
  { kind: "static", key: "tp-me", label: "Teleporter a moi", icon: Radio, commandKind: "teleport_to_me" },
  { kind: "prompt", key: "tp-to-player", label: "Teleporter vers un joueur", icon: Target, promptKey: "tp-player" },
  { kind: "static", key: "refill", label: "Recharger les munitions", icon: Zap, commandKind: "refill_ammo" },
  { kind: "static", key: "reset", label: "Reset du personnage", icon: RotateCcw, commandKind: "reset_character" },
  { kind: "prompt", key: "give-money", label: "Donner de l'argent", icon: DollarSign, promptKey: "money" },
  { kind: "prompt", key: "set-role", label: "Changer le role", icon: Crown, promptKey: "role" },
  { kind: "prompt", key: "set-team", label: "Changer d'equipe", icon: Users2, promptKey: "team" },
  { kind: "prompt", key: "force-chat", label: "Forcer a parler", icon: MessageSquareQuote, promptKey: "chat" },
  { kind: "prompt", key: "private-msg", label: "Message prive", icon: Mail, promptKey: "pm" },
  { kind: "prompt", key: "set-hp", label: "Definir la sante", icon: Heart, promptKey: "hp" },
  { kind: "prompt", key: "give-item", label: "Donner un objet", icon: Gift, promptKey: "give-item" },
  { kind: "static", key: "clone", label: "Cloner le joueur", icon: Copy, commandKind: "clone" },
  { kind: "static", key: "wipe", label: "Vider l'inventaire", icon: Trash2, commandKind: "wipe_inventory" },
]

const actionLabels: Partial<Record<CommandKind, string>> = {
  kick: "a ete kick",
  ban: "a ete banni",
  warn: "a recu un avertissement",
  mute: "a ete mute",
  unmute: "a ete unmute",
  freeze: "a ete fige",
  unfreeze: "n'est plus fige",
  heal: "a ete soigne",
  kill: "a ete tue",
  remove_armor: "n'a plus de bouclier",
  set_armor: "a un nouveau bouclier",
  set_health: "a une nouvelle sante",
  reset_character: "a ete reset",
  refill_ammo: "a ete reapprovisionne",
  teleport_to_me: "a ete teleporte vers vous",
  teleport_to_player: "a ete teleporte",
  set_team: "a change d'equipe",
  set_role: "a un nouveau role",
  force_chat: "va parler",
  private_message: "a recu un message prive",
  clone: "a ete clone",
  wipe_inventory: "a un inventaire vide",
  give_item: "a recu un objet",
  remove_item: "a perdu un objet",
  give_money: "a recu de l'argent",
}

// ---------- Configs des prompts ----------

type PromptConfig = {
  title: string
  description?: string
  tone?: "default" | "danger" | "warning" | "success"
  confirmLabel?: string
  fields: (player: Player, allPlayers: Player[]) => PromptField[]
  execute: (
    player: Player,
    values: Record<string, string>,
  ) => Promise<{ message: string; desc?: string }>
}

const promptConfigs: Record<string, PromptConfig> = {
  kick: {
    title: "Kick le joueur",
    description: "Expulse le joueur du serveur avec un message explicatif.",
    tone: "warning",
    confirmLabel: "Kick",
    fields: () => [
      {
        key: "reason",
        label: "Raison",
        type: "textarea",
        placeholder: "Ex : comportement abusif, AFK, langage...",
        required: true,
      },
    ],
    execute: async (p, v) => {
      await sendCommand("kick", {
        targetId: p.id,
        payload: { reason: v.reason },
        issuedBy: "Panel",
      })
      return { message: `${p.username} a ete kick`, desc: `Raison : ${v.reason}` }
    },
  },
  ban: {
    title: "Bannir le joueur",
    description: "Le joueur ne pourra plus rejoindre le serveur jusqu'a expiration.",
    tone: "danger",
    confirmLabel: "Bannir",
    fields: () => [
      {
        key: "reason",
        label: "Raison",
        type: "textarea",
        placeholder: "Ex : triche, toxicite, exploit...",
        required: true,
      },
      {
        key: "duration",
        label: "Duree",
        type: "select",
        defaultValue: "permanent",
        options: [
          { value: "3600000", label: "1 heure" },
          { value: "86400000", label: "24 heures" },
          { value: "604800000", label: "7 jours" },
          { value: "2592000000", label: "30 jours" },
          { value: "permanent", label: "Permanent" },
        ],
      },
    ],
    execute: async (p, v) => {
      const durationMs = v.duration === "permanent" ? undefined : Number(v.duration)
      await banPlayer(p.id, p.username, v.reason || "Aucune raison", durationMs)
      return {
        message: `${p.username} a ete banni`,
        desc: `Raison : ${v.reason}${durationMs ? ` - ${v.duration}ms` : " - permanent"}`,
      }
    },
  },
  warn: {
    title: "Avertir le joueur",
    tone: "warning",
    confirmLabel: "Avertir",
    fields: () => [
      { key: "reason", label: "Motif", type: "textarea", placeholder: "Ex : langage...", required: true },
    ],
    execute: async (p, v) => {
      await sendCommand("warn", {
        targetId: p.id,
        payload: { reason: v.reason },
        issuedBy: "Panel",
      })
      return { message: `${p.username} a recu un avertissement`, desc: v.reason }
    },
  },
  mute: {
    title: "Mute le joueur",
    tone: "warning",
    confirmLabel: "Mute",
    fields: () => [
      {
        key: "reason",
        label: "Raison",
        type: "text",
        placeholder: "Ex : insultes",
        required: true,
      },
      {
        key: "duration",
        label: "Duree (minutes)",
        type: "number",
        defaultValue: "10",
        min: 1,
        max: 1440,
      },
    ],
    execute: async (p, v) => {
      await sendCommand("mute", {
        targetId: p.id,
        payload: { reason: v.reason, durationMinutes: Number(v.duration || 10) },
        issuedBy: "Panel",
      })
      return { message: `${p.username} a ete mute`, desc: `Pour ${v.duration} min - ${v.reason}` }
    },
  },
  "tp-player": {
    title: "Teleporter vers un joueur",
    description: "Choisit la cible vers laquelle envoyer ce joueur.",
    confirmLabel: "Teleporter",
    fields: (_p, all) => [
      {
        key: "targetId",
        label: "Destination",
        type: "select",
        required: true,
        options: all.map((x) => ({ value: x.id, label: `${x.username} (${x.team || "sans equipe"})` })),
      },
    ],
    execute: async (p, v) => {
      await sendCommand("teleport_to_player", {
        targetId: p.id,
        payload: { destinationId: v.targetId },
        issuedBy: "Panel",
      })
      return { message: `${p.username} a ete teleporte` }
    },
  },
  money: {
    title: "Ajuster l'argent",
    description: "Utilise un montant negatif pour retirer de l'argent.",
    confirmLabel: "Appliquer",
    tone: "success",
    fields: () => [
      {
        key: "amount",
        label: "Montant",
        type: "number",
        placeholder: "Ex : 500 ou -200",
        required: true,
        defaultValue: "100",
      },
      { key: "reason", label: "Raison (optionnel)", placeholder: "Bonus, achat..." },
    ],
    execute: async (p, v) => {
      const delta = Number(v.amount)
      if (!Number.isFinite(delta) || delta === 0) throw new Error("Montant invalide")
      await adjustMoney(p.id, p.username, delta, v.reason || undefined)
      await sendCommand("give_money", {
        targetId: p.id,
        payload: { amount: delta, reason: v.reason },
        issuedBy: "Panel",
      })
      return {
        message: `${delta > 0 ? "+" : ""}${delta}$ pour ${p.username}`,
        desc: v.reason || undefined,
      }
    },
  },
  role: {
    title: "Changer le role",
    description: "Definit le niveau de permissions du joueur.",
    confirmLabel: "Promouvoir",
    fields: (p) => [
      {
        key: "role",
        label: "Nouveau role",
        type: "select",
        defaultValue: p.role,
        options: [
          { value: "Joueur", label: "Joueur" },
          { value: "VIP", label: "VIP" },
          { value: "Mod", label: "Moderateur" },
          { value: "Admin", label: "Administrateur" },
        ],
      },
    ],
    execute: async (p, v) => {
      await sendCommand("set_role", {
        targetId: p.id,
        payload: { role: v.role },
        issuedBy: "Panel",
      })
      return { message: `${p.username} est maintenant ${v.role}` }
    },
  },
  team: {
    title: "Changer d'equipe",
    confirmLabel: "Affecter",
    fields: (p) => [
      {
        key: "team",
        label: "Nouvelle equipe",
        placeholder: "Ex : Bleu, Rouge, Spectateurs...",
        required: true,
        defaultValue: p.team,
      },
    ],
    execute: async (p, v) => {
      await sendCommand("set_team", {
        targetId: p.id,
        payload: { team: v.team },
        issuedBy: "Panel",
      })
      return { message: `${p.username} rejoint ${v.team}` }
    },
  },
  chat: {
    title: "Forcer a parler",
    description: "Le joueur enverra ce message dans le chat public.",
    confirmLabel: "Envoyer",
    fields: () => [
      {
        key: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Bonjour tout le monde !",
        required: true,
      },
    ],
    execute: async (p, v) => {
      await sendCommand("force_chat", {
        targetId: p.id,
        payload: { message: v.message },
        issuedBy: "Panel",
      })
      return { message: `${p.username} a parle`, desc: v.message }
    },
  },
  pm: {
    title: "Message prive",
    description: "Envoie un message visible uniquement par ce joueur.",
    confirmLabel: "Envoyer",
    fields: () => [
      {
        key: "message",
        label: "Contenu",
        type: "textarea",
        placeholder: "Salut, j'ai une question...",
        required: true,
      },
    ],
    execute: async (p, v) => {
      await sendCommand("private_message", {
        targetId: p.id,
        payload: { message: v.message },
        issuedBy: "Panel",
      })
      return { message: `Message envoye a ${p.username}` }
    },
  },
  hp: {
    title: "Definir la sante",
    confirmLabel: "Appliquer",
    fields: (p) => [
      {
        key: "health",
        label: "Sante (0-100)",
        type: "number",
        min: 0,
        max: 100,
        defaultValue: p.health,
        required: true,
      },
    ],
    execute: async (p, v) => {
      const hp = Math.max(0, Math.min(100, Number(v.health)))
      await sendCommand("set_health", {
        targetId: p.id,
        payload: { health: hp },
        issuedBy: "Panel",
      })
      return { message: `${p.username} - sante definie a ${hp}%` }
    },
  },
  "give-item": {
    title: "Donner un objet",
    confirmLabel: "Donner",
    fields: () => [
      {
        key: "itemId",
        label: "Nom ou ID de l'objet",
        placeholder: "Ex : SwordTool, HealthPack",
        required: true,
      },
      {
        key: "quantity",
        label: "Quantite",
        type: "number",
        defaultValue: "1",
        min: 1,
      },
    ],
    execute: async (p, v) => {
      await sendCommand("give_item", {
        targetId: p.id,
        payload: { itemId: v.itemId, quantity: Number(v.quantity || 1) },
        issuedBy: "Panel",
      })
      return { message: `${p.username} recoit ${v.quantity}x ${v.itemId}` }
    },
  },
}

export function PlayerSlideOver({ player, allPlayers = [], onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [promptKey, setPromptKey] = useState<string | null>(null)
  const [removingItem, setRemovingItem] = useState<string | null>(null)

  useEffect(() => {
    if (player) setMounted(true)
  }, [player])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !promptKey) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, promptKey])

  const handleStatic = async (kind: CommandKind, payload?: Record<string, unknown>) => {
    if (!player) return
    setSending(kind)
    try {
      await sendCommand(kind, { targetId: player.id, payload, issuedBy: "Panel" })
      const suffix = actionLabels[kind] ?? "a ete cible"
      toast.success(`${player.username} ${suffix}`, {
        description: "Execute au prochain heartbeat.",
      })
    } catch (err) {
      toast.error("Echec de la commande", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      })
    } finally {
      setSending(null)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!player) return
    setRemovingItem(itemId)
    try {
      await sendCommand("remove_item", {
        targetId: player.id,
        payload: { itemId },
        issuedBy: "Panel",
      })
      toast.success(`${itemId} retire de l'inventaire`, {
        description: `Execute au prochain heartbeat.`,
      })
    } catch (err) {
      toast.error("Echec", {
        description: err instanceof Error ? err.message : "Erreur",
      })
    } finally {
      setRemovingItem(null)
    }
  }

  if (!player && !mounted) return null

  const activePrompt = promptKey ? promptConfigs[promptKey] : null

  const kdr = player ? (player.deaths === 0 ? player.kills : (player.kills / player.deaths).toFixed(2)) : "0"
  const joinedAgo = player ? Math.max(0, Math.round((Date.now() - player.lastSeen) / 1000)) : 0

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

      {/* Panel */}
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
                      {player.team && (
                        <span className="text-xs text-muted-foreground">{player.team}</span>
                      )}
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
                        label="Bouclier"
                        value={`${player.armor}%`}
                      />
                      <StatBox
                        icon={<DollarSign className="h-3.5 w-3.5 text-green-400" />}
                        label="Argent"
                        value={`$${player.money.toLocaleString("fr-FR")}`}
                      />
                      <StatBox
                        icon={<Target className="h-3.5 w-3.5 text-primary" />}
                        label="K / D"
                        value={`${player.kills} / ${player.deaths}`}
                      />
                      <StatBox
                        icon={<Trophy className="h-3.5 w-3.5 text-yellow-400" />}
                        label="Ratio"
                        value={`${kdr}`}
                      />
                      <StatBox
                        icon={<Clock className="h-3.5 w-3.5 text-cyan-300" />}
                        label="Temps de jeu"
                        value={player.playtime}
                      />
                      <StatBox
                        icon={<Sparkles className="h-3.5 w-3.5 text-pink-400" />}
                        label="Equipe"
                        value={player.team || "-"}
                      />
                      <StatBox
                        icon={<Timer className="h-3.5 w-3.5 text-muted-foreground" />}
                        label="Vu il y a"
                        value={`${joinedAgo}s`}
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div className="glass-subtle rounded-xl p-3">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                      <MapPin className="h-3 w-3" />
                      Position dans le monde
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

                  {/* Inventory */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        <Package className="h-3 w-3" />
                        Inventaire ({player.items.length})
                      </div>
                      {player.items.length > 0 && (
                        <button
                          onClick={() => handleStatic("wipe_inventory")}
                          disabled={sending === "wipe_inventory"}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        >
                          Tout vider
                        </button>
                      )}
                    </div>
                    {player.items.length === 0 ? (
                      <div className="glass-subtle rounded-xl p-4 text-center text-xs text-muted-foreground">
                        Aucun objet equipe
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {player.items.map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between px-3 py-2 rounded-xl glass-subtle border border-white/5 hover:border-white/10 transition-colors group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                                <Crosshair className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="text-xs font-medium truncate">{item}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              disabled={removingItem === item}
                              className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Retirer
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                            onClick={() => {
                              if (action.requiresReason) {
                                setPromptKey(action.key)
                              } else {
                                handleStatic(action.kind)
                              }
                            }}
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
                        const isSending =
                          action.kind === "static" && sending === action.commandKind
                        return (
                          <button
                            key={action.key}
                            disabled={isSending}
                            onClick={() => {
                              if (action.kind === "static") {
                                handleStatic(action.commandKind, action.payload)
                              } else {
                                setPromptKey(action.promptKey)
                              }
                            }}
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

      {/* Prompt dialogs */}
      {player && activePrompt && (
        <PromptDialog
          open={!!promptKey}
          title={activePrompt.title}
          description={activePrompt.description}
          tone={activePrompt.tone}
          confirmLabel={activePrompt.confirmLabel}
          fields={activePrompt.fields(player, allPlayers)}
          onClose={() => setPromptKey(null)}
          onSubmit={async (values) => {
            const result = await activePrompt.execute(player, values)
            toast.success(result.message, { description: result.desc })
          }}
        />
      )}
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
      <div className="text-base font-semibold mt-1 tabular-nums truncate">{value}</div>
    </div>
  )
}
