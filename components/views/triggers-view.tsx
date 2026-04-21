"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Trigger, TriggerIcon } from "@/lib/types"
import { createTrigger, patchTrigger, removeTrigger, useTriggers } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Plus,
  Wifi,
  MessageSquare,
  Shield,
  Moon,
  Mic,
  Gift,
  ChevronRight,
  Zap,
  Play,
  Pause,
  Trash2,
  Pencil,
  Loader2,
  AlertTriangle,
} from "lucide-react"

const iconMap: Record<TriggerIcon, React.ElementType> = {
  wifi: Wifi,
  "message-square": MessageSquare,
  shield: Shield,
  moon: Moon,
  mic: Mic,
  gift: Gift,
  zap: Zap,
  "alert-triangle": AlertTriangle,
}

export function TriggersView() {
  const { triggers, isLoading } = useTriggers()
  const [showNew, setShowNew] = useState(false)

  const toggleTrigger = async (t: Trigger) => {
    try {
      await patchTrigger(t.id, { enabled: !t.enabled })
      toast.success(`Trigger ${!t.enabled ? "active" : "desactive"}`, { description: t.name })
    } catch {
      toast.error("Echec de la modification")
    }
  }

  const deleteOne = async (id: string) => {
    try {
      await removeTrigger(id)
      toast.success("Trigger supprime")
    } catch {
      toast.error("Echec de la suppression")
    }
  }

  const activeCount = triggers.filter((t) => t.enabled).length
  const totalTriggered = triggers.reduce((s, t) => s + t.triggered, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Triggers & Automatisation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Creez des regles automatiques Si / Alors pour moderer le serveur.
          </p>
        </div>
        <button
          onClick={() => setShowNew((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:opacity-90 transition-opacity glow-primary"
        >
          <Plus className="h-4 w-4" />
          Nouveau trigger
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Triggers actifs"
          value={activeCount.toString()}
          hint={`sur ${triggers.length} regles`}
          color="from-primary to-accent"
          icon={Zap}
        />
        <StatCard
          label="Declenchements totaux"
          value={totalTriggered.toString()}
          hint="depuis le demarrage"
          color="from-accent to-cyan-400"
          icon={Play}
        />
        <StatCard
          label="Statut API"
          value={isLoading ? "..." : "OK"}
          hint="GET /api/triggers"
          color="from-green-500 to-emerald-400"
          icon={Wifi}
        />
      </div>

      {/* New trigger form */}
      {showNew && <NewTriggerForm onCancel={() => setShowNew(false)} />}

      {/* Trigger list */}
      {triggers.length === 0 && !isLoading && !showNew && (
        <div className="glass rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl glass-subtle flex items-center justify-center">
            <Zap className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium">Aucun trigger configure</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-md">
              Les triggers sont persistants cote API et seront charges par le script Roblox.
              Cliquez sur <span className="text-primary">Nouveau trigger</span> pour en creer un.
            </div>
          </div>
        </div>
      )}

      {isLoading && triggers.length === 0 && (
        <div className="glass rounded-2xl p-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Chargement...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {triggers.map((t) => (
          <TriggerCard key={t.id} trigger={t} onToggle={() => toggleTrigger(t)} onDelete={() => deleteOne(t.id)} />
        ))}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  color,
  icon: Icon,
}: {
  label: string
  value: string
  hint: string
  color: string
  icon: React.ElementType
}) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl`} />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
        </div>
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${color} opacity-80 flex items-center justify-center`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  )
}

function TriggerCard({
  trigger,
  onToggle,
  onDelete,
}: {
  trigger: Trigger
  onToggle: () => void
  onDelete: () => void
}) {
  const Icon = iconMap[trigger.icon] || Zap
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 group transition-all hover:border-white/15",
        !trigger.enabled && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
              trigger.enabled
                ? "bg-gradient-to-br from-primary/30 to-accent/30 glow-primary border border-primary/20"
                : "bg-white/5 border border-white/5",
            )}
          >
            <Icon className={cn("h-4 w-4", trigger.enabled ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <div className="font-medium text-sm">{trigger.name}</div>
            <div className="text-[11px] text-muted-foreground">{trigger.triggered} declenchements</div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "relative h-5 w-9 rounded-full transition-all shrink-0 mt-1",
            trigger.enabled ? "bg-gradient-to-r from-primary to-accent" : "bg-white/10",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-md",
              trigger.enabled ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* Rule */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 glass-subtle rounded-xl p-3">
          <div className="text-[9px] uppercase tracking-wider text-accent font-bold mb-1">SI</div>
          <div className="font-mono text-[11px] text-foreground/90">{trigger.condition}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 glass-subtle rounded-xl p-3">
          <div className="text-[9px] uppercase tracking-wider text-primary font-bold mb-1">ALORS</div>
          <div className="font-mono text-[11px] text-foreground/90">{trigger.action}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg glass-subtle hover:bg-white/[0.06] transition-colors">
          <Pencil className="h-3 w-3" />
          Modifier
        </button>
        <button
          onClick={() => toast.info("Simulation lancee", { description: `Test de : ${trigger.name}` })}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg glass-subtle hover:bg-white/[0.06] transition-colors"
        >
          {trigger.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          Tester
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-7 rounded-lg glass-subtle hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function NewTriggerForm({ onCancel }: { onCancel: () => void }) {
  const [name, setName] = useState("")
  const [condition, setCondition] = useState("Ping Joueur > 500ms")
  const [action, setAction] = useState("Kick automatique")
  const [icon, setIcon] = useState<TriggerIcon>("zap")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name) {
      toast.error("Nom requis")
      return
    }
    setSaving(true)
    try {
      await createTrigger({ name, condition, action, icon, enabled: true })
      toast.success("Trigger cree", { description: `« ${name} » est maintenant actif.` })
      onCancel()
    } catch {
      toast.error("Echec de creation")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-6 border-primary/20 glow-primary">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Plus className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-medium">Nouveau trigger</h2>
          <p className="text-xs text-muted-foreground">Definissez une condition et une action automatique</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Anti-cheat vitesse"
            className="mt-1.5 w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-accent font-bold">SI (condition)</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="mt-1.5 w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          >
            <option className="bg-background">Ping Joueur {">"} 500ms</option>
            <option className="bg-background">Vitesse anormale</option>
            <option className="bg-background">Mot interdit dans le tchat</option>
            <option className="bg-background">Kill streak {">"} 10</option>
            <option className="bg-background">Degats recus {">"} 500/s</option>
            <option className="bg-background">Nouveau joueur</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-primary font-bold">ALORS (action)</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="mt-1.5 w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          >
            <option className="bg-background">Kick automatique</option>
            <option className="bg-background">Ban temporaire</option>
            <option className="bg-background">Warn le joueur</option>
            <option className="bg-background">Mute tchat</option>
            <option className="bg-background">Freeze + notifier admin</option>
            <option className="bg-background">Kit de bienvenue</option>
            <option className="bg-background">Logger seulement</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Icone</label>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {(Object.keys(iconMap) as TriggerIcon[]).map((key) => {
            const I = iconMap[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition-all border",
                  icon === key
                    ? "border-primary/50 bg-primary/20 text-primary glow-primary"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06]",
                )}
              >
                <I className="h-4 w-4" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl glass-subtle text-sm hover:bg-white/[0.06] transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Creer le trigger
        </button>
      </div>
    </div>
  )
}
