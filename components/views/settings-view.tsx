"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  createCustomCommand,
  deleteCustomCommand,
  reorderCustomCommands,
  updateCustomCommand,
  useCustomCommands,
} from "@/lib/api"
import {
  COLOR_MAP,
  COLOR_NAMES,
  ICON_MAP,
  ICON_NAMES,
  getColor,
  getIcon,
} from "@/lib/icon-map"
import { LUA_TEMPLATE_PLAYER, LUA_TEMPLATE_WORLD } from "@/lib/lua-templates"
import type {
  CustomCommand,
  CustomCommandCategory,
  CustomCommandInput,
  CustomCommandInputType,
} from "@/lib/types"
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  X,
  Save,
  Loader2,
  Users,
  Globe2,
  Eye,
  EyeOff,
  ChevronDown,
  Settings2,
  Info,
  Code2,
  FormInput,
  Palette,
  Sparkles,
} from "lucide-react"

const EMPTY_COMMAND = (category: CustomCommandCategory): CustomCommand => ({
  id: "",
  name: "",
  description: "",
  icon: "zap",
  color: "primary",
  category,
  orderIndex: 0,
  inputs: [],
  luaCode: category === "player" ? LUA_TEMPLATE_PLAYER : LUA_TEMPLATE_WORLD,
  enabled: true,
  confirmRequired: false,
  createdAt: 0,
  updatedAt: 0,
})

export function SettingsView() {
  const [tab, setTab] = useState<CustomCommandCategory>("player")
  const { commands, isLoading, mutate } = useCustomCommands(tab)
  const [editing, setEditing] = useState<CustomCommand | null>(null)

  // Etat local pour le drag (optimistic)
  const [localOrder, setLocalOrder] = useState<CustomCommand[] | null>(null)
  const displayed = localOrder ?? commands

  useEffect(() => {
    setLocalOrder(null)
  }, [commands])

  const dragIndex = useRef<number | null>(null)

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx
  }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === idx) return
    const arr = [...(localOrder ?? commands)]
    const [moved] = arr.splice(dragIndex.current, 1)
    arr.splice(idx, 0, moved)
    dragIndex.current = idx
    setLocalOrder(arr)
  }
  const handleDragEnd = async () => {
    if (!localOrder) {
      dragIndex.current = null
      return
    }
    dragIndex.current = null
    try {
      await reorderCustomCommands(
        tab,
        localOrder.map((c) => c.id),
      )
      toast.success("Ordre enregistre")
      mutate()
    } catch {
      toast.error("Echec reorder")
      setLocalOrder(null)
    }
  }

  const handleToggle = async (cmd: CustomCommand) => {
    try {
      await updateCustomCommand(cmd.id, { enabled: !cmd.enabled })
      mutate()
    } catch {
      toast.error("Echec")
    }
  }

  const handleDelete = async (cmd: CustomCommand) => {
    if (!confirm(`Supprimer la commande "${cmd.name}" ?`)) return
    try {
      await deleteCustomCommand(cmd.id)
      toast.success("Commande supprimee")
      mutate()
    } catch {
      toast.error("Echec suppression")
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Parametres
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cree tes propres commandes. Elles apparaissent dans l&apos;onglet choisi et executent du
            Luau directement dans Roblox.
          </p>
        </div>
        <button
          onClick={() => setEditing(EMPTY_COMMAND(tab))}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent hover:brightness-110 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all glow-primary"
        >
          <Plus className="h-4 w-4" />
          Nouvelle commande
        </button>
      </div>

      {/* How it works */}
      <div className="glass-subtle rounded-2xl p-4 flex items-start gap-3 border border-white/5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="h-4 w-4 text-cyan-300" />
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <span className="text-foreground font-medium">Comment ca marche :</span> chaque commande
          contient du code Luau execute cote serveur Roblox. Les{" "}
          <span className="text-foreground">inputs</span> deviennent des champs de formulaire dans
          le panel et sont accessibles dans le code via{" "}
          <code className="text-primary">inputs.nomDuChamp</code>. Les commandes{" "}
          <span className="text-foreground">Joueurs</span> apparaissent dans la fiche d&apos;un
          joueur, celles <span className="text-foreground">Monde</span> dans Controle du Monde.
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1 flex items-center gap-1 w-fit">
        <TabButton active={tab === "player"} onClick={() => setTab("player")} icon={Users}>
          Commandes Joueurs
          <CountBadge count={commands.filter((c) => c.category === "player").length} />
        </TabButton>
        <TabButton active={tab === "world"} onClick={() => setTab("world")} icon={Globe2}>
          Commandes Monde
          <CountBadge count={commands.filter((c) => c.category === "world").length} />
        </TabButton>
      </div>

      {/* List */}
      <div className="glass rounded-2xl p-4">
        {isLoading && displayed.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Chargement...
          </div>
        )}
        {!isLoading && displayed.length === 0 && (
          <div className="text-center py-12">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-white/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm font-medium mb-1">Aucune commande pour l&apos;instant</div>
            <div className="text-xs text-muted-foreground mb-4">
              Cree ta premiere commande {tab === "player" ? "joueur" : "monde"} pour commencer.
            </div>
            <button
              onClick={() => setEditing(EMPTY_COMMAND(tab))}
              className="inline-flex items-center gap-2 glass-subtle px-4 py-2 rounded-xl text-sm hover:bg-white/[0.06] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Creer une commande
            </button>
          </div>
        )}
        <div className="space-y-2">
          {displayed.map((cmd, idx) => (
            <CommandRow
              key={cmd.id}
              cmd={cmd}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onEdit={() => setEditing(cmd)}
              onToggle={() => handleToggle(cmd)}
              onDelete={() => handleDelete(cmd)}
            />
          ))}
        </div>
      </div>

      {editing && (
        <CommandEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            mutate()
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
        active
          ? "bg-gradient-to-r from-primary/25 to-accent/15 border border-white/10 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="text-[10px] font-mono bg-white/[0.06] border border-white/10 rounded-md px-1.5 py-0.5 tabular-nums">
      {count}
    </span>
  )
}

function CommandRow({
  cmd,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEdit,
  onToggle,
  onDelete,
}: {
  cmd: CustomCommand
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const color = getColor(cmd.color)
  const Icon = getIcon(cmd.icon)

  return (
    <div
      draggable
      onDragStart={(e) => {
        setDragging(true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(e.dataTransfer as any).effectAllowed = "move"
        onDragStart()
      }}
      onDragOver={onDragOver}
      onDragEnd={() => {
        setDragging(false)
        onDragEnd()
      }}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl glass-subtle border border-white/5 transition-all",
        dragging && "opacity-40 scale-[0.99]",
        !cmd.enabled && "opacity-60",
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Reordonner"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className={cn(
          "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center border flex-shrink-0",
          color.bg,
          color.border,
        )}
      >
        <Icon className={cn("h-4 w-4", color.text)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{cmd.name || "(sans nom)"}</span>
          {cmd.inputs.length > 0 && (
            <span className="text-[10px] font-mono bg-white/[0.05] border border-white/10 rounded-md px-1.5 py-0.5">
              {cmd.inputs.length} input{cmd.inputs.length > 1 ? "s" : ""}
            </span>
          )}
          {cmd.confirmRequired && (
            <span className="text-[10px] font-mono bg-yellow-500/10 border border-yellow-500/20 rounded-md px-1.5 py-0.5 text-yellow-300">
              confirm
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {cmd.description || <span className="italic">Aucune description</span>}
        </div>
      </div>

      <button
        onClick={onToggle}
        title={cmd.enabled ? "Desactiver" : "Activer"}
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          cmd.enabled
            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
            : "glass-subtle text-muted-foreground hover:bg-white/5",
        )}
      >
        {cmd.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={onEdit}
        title="Modifier"
        className="h-8 w-8 rounded-lg glass-subtle hover:bg-white/[0.08] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        title="Supprimer"
        className="h-8 w-8 rounded-lg glass-subtle hover:bg-red-500/10 hover:border-red-500/20 flex items-center justify-center transition-colors text-muted-foreground hover:text-red-400 border border-transparent"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ====================== EDITEUR ======================

function CommandEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: CustomCommand
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !initial.id
  const [cmd, setCmd] = useState<CustomCommand>(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const Icon = getIcon(cmd.icon)
  const color = getColor(cmd.color)

  const handleSave = async () => {
    if (!cmd.name.trim()) {
      setErr("Le nom est obligatoire.")
      return
    }
    // Verifie les keys des inputs : uniques et valides
    const keys = cmd.inputs.map((i) => i.key)
    const dup = keys.find((k, i) => keys.indexOf(k) !== i)
    if (dup) {
      setErr(`La cle d'input "${dup}" est dupliquee.`)
      return
    }
    for (const i of cmd.inputs) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(i.key)) {
        setErr(`La cle "${i.key}" est invalide (lettres, chiffres, _ uniquement, pas de chiffre en debut).`)
        return
      }
    }

    setErr(null)
    setSaving(true)
    try {
      if (isNew) {
        await createCustomCommand({
          name: cmd.name,
          description: cmd.description,
          icon: cmd.icon,
          color: cmd.color,
          category: cmd.category,
          inputs: cmd.inputs,
          luaCode: cmd.luaCode,
          enabled: cmd.enabled,
          confirmRequired: cmd.confirmRequired,
        })
        toast.success("Commande creee")
      } else {
        await updateCustomCommand(cmd.id, {
          name: cmd.name,
          description: cmd.description,
          icon: cmd.icon,
          color: cmd.color,
          category: cmd.category,
          inputs: cmd.inputs,
          luaCode: cmd.luaCode,
          enabled: cmd.enabled,
          confirmRequired: cmd.confirmRequired,
        })
        toast.success("Commande mise a jour")
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-stretch justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in"
      />
      <div className="relative w-full max-w-3xl h-full glass-strong shadow-[0_0_80px_-20px_rgba(168,132,255,0.4)] flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center border flex-shrink-0",
                color.bg,
                color.border,
              )}
            >
              <Icon className={cn("h-4 w-4", color.text)} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight truncate">
                {isNew ? "Nouvelle commande" : cmd.name || "(sans nom)"}
              </h2>
              <div className="text-xs text-muted-foreground">
                Categorie : {cmd.category === "player" ? "Joueur" : "Monde"}
                {!isNew && " - " + (cmd.enabled ? "Active" : "Desactivee")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent hover:brightness-110 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all glow-primary disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl glass-subtle hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {/* Section 1 : Identite */}
          <Section title="Identite" icon={Palette}>
            <div className="grid md:grid-cols-2 gap-4">
              <FieldLabel label="Nom" required>
                <input
                  value={cmd.name}
                  onChange={(e) => setCmd({ ...cmd, name: e.target.value })}
                  placeholder="Ex : Booster la vitesse"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </FieldLabel>

              <FieldLabel label="Categorie">
                <select
                  value={cmd.category}
                  onChange={(e) =>
                    setCmd({ ...cmd, category: e.target.value as CustomCommandCategory })
                  }
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="player" className="bg-background">
                    Joueur (affichee dans la fiche joueur)
                  </option>
                  <option value="world" className="bg-background">
                    Monde (affichee dans Controle du Monde)
                  </option>
                </select>
              </FieldLabel>
            </div>

            <FieldLabel label="Description (tooltip)">
              <input
                value={cmd.description}
                onChange={(e) => setCmd({ ...cmd, description: e.target.value })}
                placeholder="Courte explication de ce que fait cette commande"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </FieldLabel>

            {/* Icon + color pickers */}
            <div className="grid md:grid-cols-2 gap-4">
              <FieldLabel label="Icone">
                <IconPicker value={cmd.icon} onChange={(icon) => setCmd({ ...cmd, icon })} />
              </FieldLabel>
              <FieldLabel label="Couleur">
                <ColorPicker value={cmd.color} onChange={(c) => setCmd({ ...cmd, color: c })} />
              </FieldLabel>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <OptionRow
                label="Active"
                desc="Si desactivee, la commande n'apparait pas dans le panel"
                checked={cmd.enabled}
                onChange={(v) => setCmd({ ...cmd, enabled: v })}
              />
              <OptionRow
                label="Demander confirmation"
                desc="Ouvre un dialog avant l'execution, meme sans inputs"
                checked={cmd.confirmRequired}
                onChange={(v) => setCmd({ ...cmd, confirmRequired: v })}
              />
            </div>
          </Section>

          {/* Section 2 : Inputs builder */}
          <Section title="Formulaire (inputs)" icon={FormInput}>
            <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
              Chaque input devient un champ du formulaire affiche avant l&apos;execution. Utilise{" "}
              <code className="text-primary">inputs.key</code> dans ton code Lua pour recuperer la
              valeur.
            </p>
            <InputsBuilder
              inputs={cmd.inputs}
              onChange={(inputs) => setCmd({ ...cmd, inputs })}
            />
          </Section>

          {/* Section 3 : Lua */}
          <Section title="Code Luau" icon={Code2}>
            <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
              Ce code s&apos;execute cote serveur Roblox au prochain heartbeat (max 3s). Lis le
              commentaire en tete pour connaitre les variables disponibles.
            </p>
            <LuaEditor
              value={cmd.luaCode}
              onChange={(code) => setCmd({ ...cmd, luaCode: code })}
              category={cmd.category}
            />
          </Section>

          {err && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function FieldLabel({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function OptionRow({
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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
        checked
          ? "bg-gradient-to-br from-primary/15 to-accent/10 border-primary/25"
          : "glass-subtle border-white/10 hover:bg-white/[0.04]",
      )}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <div
        className={cn(
          "h-5 w-9 rounded-full transition-colors flex-shrink-0 relative",
          checked ? "bg-primary" : "bg-white/10",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </div>
    </button>
  )
}

// ====================== ICON PICKER ======================

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const filtered = useMemo(
    () =>
      ICON_NAMES.filter((n) => n.toLowerCase().includes(search.toLowerCase())).slice(0, 200),
    [search],
  )
  const Current = getIcon(value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 hover:bg-white/[0.05] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm">
          <Current className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs">{value}</span>
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 glass-strong rounded-xl overflow-hidden border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
          <input
            autoFocus
            placeholder="Rechercher une icone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border-b border-white/10 px-3 py-2 text-xs focus:outline-none"
          />
          <div className="grid grid-cols-8 gap-1 p-2 max-h-60 overflow-y-auto custom-scrollbar">
            {filtered.map((name) => {
              const I = ICON_MAP[name]
              const active = value === name
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name)
                    setOpen(false)
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                    active
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : "hover:bg-white/[0.06] text-muted-foreground",
                  )}
                >
                  <I className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {COLOR_NAMES.map((name) => {
        const c = COLOR_MAP[name]
        const active = value === name
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            title={name}
            className={cn(
              "h-8 w-8 rounded-lg bg-gradient-to-br transition-all border",
              c.gradient,
              active
                ? "scale-110 ring-2 border-white/20 " + c.ring
                : "border-white/10 hover:scale-105",
            )}
          />
        )
      })}
    </div>
  )
}

// ====================== INPUTS BUILDER ======================

const INPUT_TYPE_OPTIONS: { value: CustomCommandInputType; label: string }[] = [
  { value: "text", label: "Texte" },
  { value: "textarea", label: "Texte long" },
  { value: "number", label: "Nombre" },
  { value: "boolean", label: "Oui / Non" },
  { value: "select", label: "Liste (select)" },
]

function InputsBuilder({
  inputs,
  onChange,
}: {
  inputs: CustomCommandInput[]
  onChange: (v: CustomCommandInput[]) => void
}) {
  const dragIdx = useRef<number | null>(null)

  const add = () => {
    const n = inputs.length + 1
    onChange([
      ...inputs,
      {
        key: `champ${n}`,
        label: `Champ ${n}`,
        type: "text",
        required: false,
      },
    ])
  }
  const remove = (idx: number) => {
    onChange(inputs.filter((_, i) => i !== idx))
  }
  const update = (idx: number, patch: Partial<CustomCommandInput>) => {
    onChange(inputs.map((i, x) => (x === idx ? { ...i, ...patch } : i)))
  }

  return (
    <div className="space-y-2">
      {inputs.length === 0 && (
        <div className="glass-subtle rounded-xl p-5 text-center text-xs text-muted-foreground border border-dashed border-white/10">
          Aucun input. Cette commande s&apos;executera directement au clic (ou avec une simple
          confirmation si tu l&apos;actives).
        </div>
      )}
      {inputs.map((inp, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={() => {
            dragIdx.current = idx
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (dragIdx.current === null || dragIdx.current === idx) return
            const arr = [...inputs]
            const [m] = arr.splice(dragIdx.current, 1)
            arr.splice(idx, 0, m)
            dragIdx.current = idx
            onChange(arr)
          }}
          onDragEnd={() => {
            dragIdx.current = null
          }}
          className="glass-subtle rounded-xl p-3 border border-white/5 space-y-2"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
            <span className="text-[10px] font-mono bg-white/[0.05] border border-white/10 rounded-md px-1.5 py-0.5 text-muted-foreground">
              #{idx + 1}
            </span>
            <input
              value={inp.label}
              onChange={(e) => update(idx, { label: e.target.value })}
              placeholder="Libelle affiche"
              className="flex-1 bg-transparent border-b border-white/10 focus:border-primary/50 text-sm focus:outline-none px-1 py-1"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="h-7 w-7 rounded-lg glass-subtle hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-2">
            <MiniField label="Key (nom Lua)">
              <input
                value={inp.key}
                onChange={(e) => update(idx, { key: e.target.value })}
                placeholder="speed"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/50 transition-colors"
              />
            </MiniField>
            <MiniField label="Type">
              <select
                value={inp.type}
                onChange={(e) => update(idx, { type: e.target.value as CustomCommandInputType })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
              >
                {INPUT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-background">
                    {o.label}
                  </option>
                ))}
              </select>
            </MiniField>
            <MiniField label="Defaut">
              <input
                value={inp.defaultValue ?? ""}
                onChange={(e) => update(idx, { defaultValue: e.target.value })}
                placeholder="Valeur initiale"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
              />
            </MiniField>
          </div>

          <div className="grid md:grid-cols-3 gap-2">
            <MiniField label="Placeholder">
              <input
                value={inp.placeholder ?? ""}
                onChange={(e) => update(idx, { placeholder: e.target.value })}
                placeholder="Texte indicatif"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
              />
            </MiniField>
            {inp.type === "number" && (
              <>
                <MiniField label="Min">
                  <input
                    type="number"
                    value={inp.min ?? ""}
                    onChange={(e) =>
                      update(idx, { min: e.target.value === "" ? undefined : Number(e.target.value) })
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </MiniField>
                <MiniField label="Max">
                  <input
                    type="number"
                    value={inp.max ?? ""}
                    onChange={(e) =>
                      update(idx, { max: e.target.value === "" ? undefined : Number(e.target.value) })
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </MiniField>
              </>
            )}
            {inp.type !== "number" && (
              <div className="md:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() => update(idx, { required: !inp.required })}
                  className={cn(
                    "text-[11px] px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                    inp.required
                      ? "bg-red-500/10 border-red-500/25 text-red-300"
                      : "glass-subtle border-white/10 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {inp.required ? "Obligatoire" : "Optionnel"}
                </button>
              </div>
            )}
          </div>

          {inp.type === "number" && (
            <div className="grid md:grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => update(idx, { required: !inp.required })}
                className={cn(
                  "text-[11px] px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 justify-center",
                  inp.required
                    ? "bg-red-500/10 border-red-500/25 text-red-300"
                    : "glass-subtle border-white/10 text-muted-foreground hover:text-foreground",
                )}
              >
                {inp.required ? "Obligatoire" : "Optionnel"}
              </button>
            </div>
          )}

          {inp.type === "select" && (
            <SelectOptionsBuilder
              options={inp.options ?? []}
              onChange={(options) => update(idx, { options })}
            />
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 glass-subtle rounded-xl px-3 py-2.5 text-xs font-medium border border-dashed border-white/15 hover:bg-white/[0.04] hover:border-primary/40 transition-all text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter un input
      </button>
    </div>
  )
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      {children}
    </div>
  )
}

function SelectOptionsBuilder({
  options,
  onChange,
}: {
  options: { value: string; label: string }[]
  onChange: (v: { value: string; label: string }[]) => void
}) {
  const add = () => onChange([...options, { value: `option${options.length + 1}`, label: `Option ${options.length + 1}` }])
  const remove = (idx: number) => onChange(options.filter((_, i) => i !== idx))
  const update = (idx: number, patch: Partial<{ value: string; label: string }>) =>
    onChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  return (
    <div className="space-y-1.5 pl-4 border-l-2 border-white/5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
        Options du select
      </div>
      {options.map((o, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input
            value={o.value}
            onChange={(e) => update(idx, { value: e.target.value })}
            placeholder="value"
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-primary/50"
          />
          <input
            value={o.label}
            onChange={(e) => update(idx, { label: e.target.value })}
            placeholder="label affiche"
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="h-6 w-6 rounded-lg glass-subtle hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-400"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-[10px] glass-subtle rounded-lg px-2 py-1 hover:bg-white/[0.05] transition-colors"
      >
        + Option
      </button>
    </div>
  )
}

// ====================== LUA EDITOR ======================

function LuaEditor({
  value,
  onChange,
  category,
}: {
  value: string
  onChange: (v: string) => void
  category: CustomCommandCategory
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  const resetTemplate = () => {
    if (!confirm("Remplacer le code par le template de demarrage ?")) return
    onChange(category === "player" ? LUA_TEMPLATE_PLAYER : LUA_TEMPLATE_WORLD)
  }

  // Support TAB dans le textarea (indente de 4 espaces)
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = taRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = value.substring(0, start) + "    " + value.substring(end)
      onChange(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4
      })
    }
  }

  const lineCount = value.split("\n").length

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          custom_command.lua
          <span className="text-muted-foreground/60">- {lineCount} lignes</span>
        </div>
        <button
          type="button"
          onClick={resetTemplate}
          className="text-[10px] glass-subtle px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors flex items-center gap-1"
        >
          <Sparkles className="h-3 w-3" />
          Template
        </button>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        spellCheck={false}
        className="w-full min-h-[300px] bg-[#0a0818] p-3 text-[12px] leading-[1.55] font-mono text-foreground/85 focus:outline-none resize-y custom-scrollbar"
      />
    </div>
  )
}
