"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { WorldState } from "@/lib/types"
import { patchWorld, useWorld } from "@/lib/api"
import {
  Gauge,
  ArrowUpFromLine,
  Footprints,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  CloudFog,
  Flame,
  Sparkles,
  Wind,
  Loader2,
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
}

export function WorldControlView() {
  const { world, isLoading } = useWorld()
  // Etat local pour sliders (optimistic). Sync quand le world arrive.
  const [local, setLocal] = useState<WorldState>(DEFAULTS)

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

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Controle du Monde</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modifiez la physique, le cycle jour/nuit et la meteo en direct.
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
              <p className="text-xs text-muted-foreground">Workspace.Gravity, Humanoid.JumpHeight, WalkSpeed</p>
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

          {/* Sky visualizer */}
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

      {/* Weather panel */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center">
            <CloudRain className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-medium">Meteo globale</h2>
            <p className="text-xs text-muted-foreground">Appliquee a tous les joueurs connectes</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: "clear", label: "Ciel degage", icon: Sun, color: "from-yellow-400 to-orange-400" },
            { key: "rain", label: "Pluie", icon: CloudRain, color: "from-blue-400 to-cyan-400" },
            { key: "snow", label: "Neige", icon: Snowflake, color: "from-cyan-300 to-white" },
            { key: "fog", label: "Brouillard", icon: CloudFog, color: "from-slate-400 to-slate-500" },
            { key: "storm", label: "Orage", icon: Wind, color: "from-purple-500 to-indigo-600" },
            { key: "clear", label: "Cendres", icon: Flame, color: "from-orange-500 to-red-500" },
          ].map((w, idx) => {
            const Icon = w.icon
            const active = local.weather === w.key && idx < 5
            return (
              <button
                key={`${w.key}-${idx}`}
                onClick={() => apply({ weather: w.key as WorldState["weather"] }, `Meteo: ${w.label}`)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border",
                  active
                    ? "glass-strong border-white/20 glow-primary"
                    : "glass-subtle hover:bg-white/[0.05] border-transparent",
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                    active ? w.color : "from-white/5 to-white/[0.02]",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-white" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {w.label}
                </span>
                {active && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary glow-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Effects panel */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-medium">Effets globaux</h2>
            <p className="text-xs text-muted-foreground">Regles de jeu</p>
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
            label="PvP Global"
            desc="Active les combats joueur contre joueur"
            checked={local.pvpEnabled}
            onChange={(v) => apply({ pvpEnabled: v }, `PvP : ${v ? "ON" : "OFF"}`)}
          />
        </div>
      </div>
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
