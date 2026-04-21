"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { WorldState } from "@/lib/types"
import { patchWorld, sendCommand, useWorld } from "@/lib/api"
import { PromptDialog, type PromptField } from "@/components/prompt-dialog"
import {
  Gauge,
  ArrowUpFromLine,
  Footprints,
  Sun,
  Moon,
  Sparkles,
  Loader2,
  Lock,
  Unlock,
  DoorClosed,
  DoorOpen,
  Wrench,
  ArrowDown,
  Users,
  Megaphone,
  RefreshCw,
  Power,
  UserX,
  Rewind,
} from "lucide-react"

const DEFAULTS: WorldState = {
  gravity: 196.2,
  jumpHeight: 7.2,
  walkSpeed: 16,
  timeOfDay: 14,
  autoCycle: true,
  weather: "clear",
  pvpEnabled: true,
  friendlyFire: false,
  serverLocked: false,
  mapClosed: false,
  maintenanceMode: false,
  fallDamage: true,
  slowMotion: 1,
  maxPlayers: 30,
}

type PromptConf = {
  title: string
  description?: string
  tone?: "default" | "danger" | "warning" | "success"
  confirmLabel?: string
  fields: PromptField[]
  run: (values: Record<string, string>) => Promise<{ msg: string; desc?: string }>
}

export function WorldControlView() {
  const { world, isLoading } = useWorld()
  // Etat local pour sliders (optimistic). Sync quand le world arrive.
  const [local, setLocal] = useState<WorldState>(DEFAULTS)
  const [promptKey, setPromptKey] = useState<string | null>(null)

  useEffect(() => {
    if (world) setLocal(world)
  }, [world])

  const apply = (patch: Partial<WorldState>, toastMsg?: string) => {
    setLocal((prev) => ({ ...prev, ...patch }))
    patchWorld(patch)
      .then(() => {
        if (toastMsg) toast.success(toastMsg, { description: "Applique en jeu au prochain heartbeat." })
      })
      .catch(() => toast.error("Echec de mise a jour du monde"))
  }

  const isNight = local.timeOfDay < 6 || local.timeOfDay > 19

  const prompts: Record<string, PromptConf> = {
    announce: {
      title: "Annonce serveur",
      description: "Affiche un message a tous les joueurs connectes.",
      confirmLabel: "Envoyer",
      fields: [
        {
          key: "message",
          label: "Message",
          type: "textarea",
          placeholder: "Ex : Redemarrage dans 5 minutes.",
          required: true,
        },
        {
          key: "durationSec",
          label: "Duree d'affichage (secondes)",
          type: "number",
          defaultValue: "8",
          min: 1,
          max: 60,
        },
      ],
      run: async (v) => {
        await sendCommand("announce", {
          payload: { message: v.message, durationSec: Number(v.durationSec || 8) },
          issuedBy: "Panel",
        })
        return { msg: "Annonce envoyee a tous les joueurs", desc: v.message }
      },
    },
    "kick-all": {
      title: "Kick tous les joueurs",
      description: "Expulse tous les joueurs non-admin du serveur.",
      tone: "warning",
      confirmLabel: "Kick tout le monde",
      fields: [
        {
          key: "reason",
          label: "Raison affichee",
          type: "textarea",
          placeholder: "Ex : Redemarrage technique",
          required: true,
        },
        {
          key: "keepAdmins",
          label: "Conserver les admins",
          type: "select",
          defaultValue: "true",
          options: [
            { value: "true", label: "Oui (recommande)" },
            { value: "false", label: "Non - kick tout le monde" },
          ],
        },
      ],
      run: async (v) => {
        await sendCommand("kick_all", {
          payload: { reason: v.reason, keepAdmins: v.keepAdmins === "true" },
          issuedBy: "Panel",
        })
        return { msg: "Kick serveur diffuse", desc: v.reason }
      },
    },
    shutdown: {
      title: "Arreter le serveur",
      description: "Ferme le serveur proprement. Tous les joueurs seront expulses.",
      tone: "danger",
      confirmLabel: "Arreter",
      fields: [
        {
          key: "reason",
          label: "Raison",
          type: "textarea",
          placeholder: "Ex : Maintenance urgente",
          required: true,
        },
        {
          key: "countdownSec",
          label: "Compte a rebours (secondes)",
          type: "number",
          defaultValue: "10",
          min: 0,
          max: 300,
        },
      ],
      run: async (v) => {
        await sendCommand("server_shutdown", {
          payload: { reason: v.reason, countdownSec: Number(v.countdownSec || 10) },
          issuedBy: "Panel",
        })
        return { msg: "Arret du serveur programme", desc: `${v.countdownSec}s - ${v.reason}` }
      },
    },
    restart: {
      title: "Redemarrer le serveur",
      description: "Relance le serveur apres un compte a rebours.",
      tone: "warning",
      confirmLabel: "Redemarrer",
      fields: [
        {
          key: "reason",
          label: "Raison",
          type: "text",
          placeholder: "Ex : Patch 1.2",
          required: true,
        },
        {
          key: "countdownSec",
          label: "Compte a rebours (secondes)",
          type: "number",
          defaultValue: "30",
          min: 5,
          max: 600,
        },
      ],
      run: async (v) => {
        await sendCommand("server_restart", {
          payload: { reason: v.reason, countdownSec: Number(v.countdownSec || 30) },
          issuedBy: "Panel",
        })
        return { msg: "Redemarrage programme", desc: `${v.countdownSec}s - ${v.reason}` }
      },
    },
    "max-players": {
      title: "Limite de joueurs",
      description: "Modifie le nombre maximum de joueurs autorises.",
      confirmLabel: "Appliquer",
      fields: [
        {
          key: "max",
          label: "Nouveau maximum",
          type: "number",
          defaultValue: String(local.maxPlayers),
          min: 1,
          max: 100,
          required: true,
        },
      ],
      run: async (v) => {
        const max = Math.max(1, Math.min(100, Number(v.max)))
        await patchWorld({ maxPlayers: max })
        return { msg: `Maximum reglé a ${max} joueurs` }
      },
    },
  }

  const activePrompt = promptKey ? prompts[promptKey] : null

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Controle du Monde</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Physique, cycle jour/nuit et options serveur en direct.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Sync
            </span>
          )}
          <button
            onClick={() => apply(DEFAULTS, "Monde reinitialise")}
            className="glass-subtle px-4 py-2 rounded-xl text-sm hover:bg-white/[0.06] transition-colors"
          >
            Reinitialiser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Physics panel */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Gauge className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-medium">Physique du jeu</h2>
              <p className="text-xs text-muted-foreground">Gravite, saut, vitesse et slow-motion</p>
            </div>
          </div>

          <div className="space-y-6">
            <SliderRow
              icon={<Gauge className="h-3.5 w-3.5" />}
              label="Gravite"
              value={local.gravity}
              min={0}
              max={400}
              step={1}
              unit="studs/s²"
              defaultHint="Defaut : 196.2"
              onChange={(v) => setLocal((p) => ({ ...p, gravity: v }))}
              onCommit={(v) => apply({ gravity: v })}
            />
            <SliderRow
              icon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
              label="Hauteur de saut"
              value={local.jumpHeight}
              min={0}
              max={30}
              step={0.1}
              unit="studs"
              defaultHint="Defaut : 7.2"
              onChange={(v) => setLocal((p) => ({ ...p, jumpHeight: v }))}
              onCommit={(v) => apply({ jumpHeight: v })}
            />
            <SliderRow
              icon={<Footprints className="h-3.5 w-3.5" />}
              label="Vitesse de marche"
              value={local.walkSpeed}
              min={1}
              max={100}
              step={1}
              unit="studs/s"
              defaultHint="Defaut : 16"
              onChange={(v) => setLocal((p) => ({ ...p, walkSpeed: v }))}
              onCommit={(v) => apply({ walkSpeed: v })}
            />
            <SliderRow
              icon={<Rewind className="h-3.5 w-3.5" />}
              label="Slow motion"
              value={local.slowMotion}
              min={0.1}
              max={3}
              step={0.05}
              unit="x"
              defaultHint="Defaut : 1"
              onChange={(v) => setLocal((p) => ({ ...p, slowMotion: v }))}
              onCommit={(v) => apply({ slowMotion: v })}
            />
          </div>
        </div>

        {/* Day/Night panel */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                isNight
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                  : "bg-gradient-to-br from-yellow-400 to-orange-500",
              )}
            >
              {isNight ? <Moon className="h-4 w-4 text-white" /> : <Sun className="h-4 w-4 text-white" />}
            </div>
            <div>
              <h2 className="font-medium">Cycle Jour / Nuit</h2>
              <p className="text-xs text-muted-foreground">
                Heure actuelle : {String(local.timeOfDay).padStart(2, "0")}:00
              </p>
            </div>
          </div>

          <div
            className="relative h-28 rounded-2xl overflow-hidden mb-5 border border-white/10"
            style={{
              background: isNight
                ? "linear-gradient(to bottom, #0a0614 0%, #1a0f3d 60%, #2a1560 100%)"
                : "linear-gradient(to bottom, #5ec8ff 0%, #a884ff 70%, #ff9e5e 100%)",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {isNight ? <Moon className="h-10 w-10 text-white/80" /> : <Sun className="h-10 w-10 text-yellow-200" />}
            </div>
            {isNight &&
              [...Array(30)].map((_, i) => (
                <span
                  key={i}
                  className="absolute bg-white rounded-full"
                  style={{
                    width: `${Math.random() * 2 + 1}px`,
                    height: `${Math.random() * 2 + 1}px`,
                    top: `${Math.random() * 70}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.8 + 0.2,
                  }}
                />
              ))}
          </div>

          <SliderRow
            icon={<Sun className="h-3.5 w-3.5" />}
            label="Heure de la journee"
            value={local.timeOfDay}
            min={0}
            max={23}
            step={1}
            unit="h"
            defaultHint="0h - 23h"
            onChange={(v) => setLocal((p) => ({ ...p, timeOfDay: v }))}
            onCommit={(v) => apply({ timeOfDay: v })}
          />

          <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Cycle automatique</span>
              <span className="text-xs text-muted-foreground">(Lighting.ClockTime auto)</span>
            </div>
            <ToggleSwitch
              checked={local.autoCycle}
              onChange={(v) => apply({ autoCycle: v }, v ? "Cycle auto active" : "Cycle auto desactive")}
            />
          </div>
        </div>
      </div>

      {/* Server / access panel */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-primary flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-medium">Acces & Map</h2>
            <p className="text-xs text-muted-foreground">Controlez l'entree des joueurs et la map</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BigToggle
            label="Verrouiller le serveur"
            desc="Empeche toute nouvelle connexion"
            checked={local.serverLocked}
            onIcon={Lock}
            offIcon={Unlock}
            onChange={(v) => apply({ serverLocked: v }, v ? "Serveur verrouille" : "Serveur deverrouille")}
            tone={local.serverLocked ? "warning" : "default"}
          />
          <BigToggle
            label="Fermer la map"
            desc="Bloque les joueurs dans le lobby / spawn"
            checked={local.mapClosed}
            onIcon={DoorClosed}
            offIcon={DoorOpen}
            onChange={(v) => apply({ mapClosed: v }, v ? "Map fermee" : "Map ouverte")}
            tone={local.mapClosed ? "warning" : "default"}
          />
          <BigToggle
            label="Mode maintenance"
            desc="Seuls les Admins peuvent jouer"
            checked={local.maintenanceMode}
            onIcon={Wrench}
            offIcon={Wrench}
            onChange={(v) =>
              apply({ maintenanceMode: v }, v ? "Maintenance activee" : "Maintenance desactivee")
            }
            tone={local.maintenanceMode ? "danger" : "default"}
          />
          <BigToggle
            label="Degats de chute"
            desc="Inflige des degats lors des grandes chutes"
            checked={local.fallDamage}
            onIcon={ArrowDown}
            offIcon={ArrowDown}
            onChange={(v) =>
              apply({ fallDamage: v }, v ? "Degats de chute actives" : "Degats de chute desactives")
            }
          />
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Nombre max de joueurs</div>
            <div className="text-xs text-muted-foreground">Actuellement : {local.maxPlayers}</div>
          </div>
          <button
            onClick={() => setPromptKey("max-players")}
            className="glass-subtle px-4 py-2 rounded-xl text-sm hover:bg-white/[0.06] transition-colors"
          >
            Modifier
          </button>
        </div>
      </div>

      {/* Gameplay effects */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-medium">Regles de combat</h2>
            <p className="text-xs text-muted-foreground">Comportement du PvP global</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EffectToggle
            label="Friendly Fire"
            desc="Autorise les degats entre allies"
            checked={local.friendlyFire}
            onChange={(v) => apply({ friendlyFire: v }, `Friendly Fire : ${v ? "ON" : "OFF"}`)}
          />
          <EffectToggle
            label="PvP global"
            desc="Active les combats joueur contre joueur"
            checked={local.pvpEnabled}
            onChange={(v) => apply({ pvpEnabled: v }, `PvP : ${v ? "ON" : "OFF"}`)}
          />
        </div>
      </div>

      {/* Server actions */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Megaphone className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-medium">Actions serveur</h2>
            <p className="text-xs text-muted-foreground">Diffusion, kick global et cycle de vie</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionTile
            icon={Megaphone}
            label="Annonce"
            desc="Broadcast message"
            onClick={() => setPromptKey("announce")}
            tone="primary"
          />
          <ActionTile
            icon={UserX}
            label="Kick tous"
            desc="Expulser les joueurs"
            onClick={() => setPromptKey("kick-all")}
            tone="warning"
          />
          <ActionTile
            icon={RefreshCw}
            label="Redemarrer"
            desc="Relance le serveur"
            onClick={() => setPromptKey("restart")}
            tone="warning"
          />
          <ActionTile
            icon={Power}
            label="Arreter"
            desc="Shutdown"
            onClick={() => setPromptKey("shutdown")}
            tone="danger"
          />
        </div>
      </div>

      {activePrompt && (
        <PromptDialog
          open={!!promptKey}
          title={activePrompt.title}
          description={activePrompt.description}
          tone={activePrompt.tone}
          confirmLabel={activePrompt.confirmLabel}
          fields={activePrompt.fields}
          onClose={() => setPromptKey(null)}
          onSubmit={async (values) => {
            const r = await activePrompt.run(values)
            toast.success(r.msg, { description: r.desc })
          }}
        />
      )}
    </div>
  )
}

function SliderRow({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  defaultHint,
  onChange,
  onCommit,
}: {
  icon: React.ReactNode
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  defaultHint: string
  onChange: (v: number) => void
  onCommit: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{defaultHint}</span>
          <span className="text-sm font-mono tabular-nums bg-white/[0.04] border border-white/10 rounded-md px-2 py-0.5 min-w-16 text-center">
            {value}
            <span className="text-muted-foreground text-[10px] ml-0.5">{unit}</span>
          </span>
        </div>
      </div>
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseUp={(e) => onCommit(parseFloat((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => onCommit(parseFloat((e.target as HTMLInputElement).value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white shadow-lg pointer-events-none"
          style={{ left: `${pct}%`, boxShadow: "0 0 12px rgba(168,132,255,0.6)" }}
        />
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-all",
        checked ? "bg-gradient-to-r from-primary to-accent glow-primary" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-md",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

function EffectToggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between glass-subtle rounded-xl p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

function BigToggle({
  label,
  desc,
  checked,
  onChange,
  onIcon: OnIcon,
  offIcon: OffIcon,
  tone = "default",
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
  onIcon: React.ElementType
  offIcon: React.ElementType
  tone?: "default" | "warning" | "danger"
}) {
  const Icon = checked ? OnIcon : OffIcon
  const iconColor =
    tone === "danger" && checked
      ? "text-red-400"
      : tone === "warning" && checked
        ? "text-yellow-400"
        : checked
          ? "text-primary"
          : "text-muted-foreground"

  return (
    <div
      className={cn(
        "flex items-center justify-between glass-subtle rounded-xl p-4 border transition-colors",
        checked && tone === "danger" && "border-red-500/30",
        checked && tone === "warning" && "border-yellow-500/30",
        checked && tone === "default" && "border-primary/30",
        !checked && "border-transparent",
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
            checked ? "bg-white/[0.06]" : "bg-white/[0.03]",
          )}
        >
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

function ActionTile({
  icon: Icon,
  label,
  desc,
  onClick,
  tone = "default",
  loading,
}: {
  icon: React.ElementType
  label: string
  desc: string
  onClick: () => void
  tone?: "default" | "primary" | "warning" | "danger"
  loading?: boolean
}) {
  const colors = {
    default: "from-white/5 to-white/[0.02] border-white/10 hover:border-white/20 text-foreground",
    primary: "from-primary/20 to-primary/5 border-primary/30 hover:border-primary/50 text-primary",
    warning: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400",
    danger: "from-red-500/20 to-red-500/5 border-red-500/30 hover:border-red-500/50 text-red-400",
  }[tone]
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex flex-col items-start gap-1 p-4 rounded-xl bg-gradient-to-br border transition-all hover:scale-[1.02] disabled:opacity-50 text-left",
        colors,
      )}
    >
      <div className="flex items-center gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
    </button>
  )
}
