"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"

export type PromptField = {
  key: string
  label: string
  placeholder?: string
  type?: "text" | "number" | "textarea" | "select"
  options?: { value: string; label: string }[]
  defaultValue?: string | number
  required?: boolean
  min?: number
  max?: number
  step?: number
  hint?: string
}

export type PromptDialogProps = {
  open: boolean
  title: string
  description?: string
  fields: PromptField[]
  confirmLabel?: string
  cancelLabel?: string
  tone?: "default" | "danger" | "warning" | "success"
  onClose: () => void
  onSubmit: (values: Record<string, string>) => Promise<void> | void
}

export function PromptDialog({
  open,
  title,
  description,
  fields,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "default",
  onClose,
  onSubmit,
}: PromptDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {}
      fields.forEach((f) => {
        init[f.key] = f.defaultValue !== undefined ? String(f.defaultValue) : ""
      })
      setValues(init)
      setError(null)
      // Focus le premier champ
      setTimeout(() => firstRef.current?.focus(), 80)
    }
    // fields est recree a chaque render cote parent, mais on ne veut reinitialiser qu'a l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  const toneRing =
    tone === "danger"
      ? "from-red-500/30 via-transparent to-transparent"
      : tone === "warning"
        ? "from-yellow-500/25 via-transparent to-transparent"
        : tone === "success"
          ? "from-green-500/25 via-transparent to-transparent"
          : "from-primary/25 via-transparent to-transparent"

  const confirmBtn =
    tone === "danger"
      ? "bg-gradient-to-r from-red-500 to-orange-500 hover:brightness-110"
      : tone === "warning"
        ? "bg-gradient-to-r from-yellow-500 to-orange-400 hover:brightness-110"
        : tone === "success"
          ? "bg-gradient-to-r from-green-500 to-emerald-400 hover:brightness-110"
          : "bg-gradient-to-r from-primary to-accent hover:brightness-110"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Validation requise
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        setError(`Le champ "${f.label}" est obligatoire.`)
        return
      }
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec")
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md glass-strong rounded-2xl overflow-hidden shadow-[0_20px_80px_-20px_rgba(168,132,255,0.5)] animate-in fade-in zoom-in-95 duration-200"
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-px bg-gradient-to-r",
            toneRing,
          )}
        />
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div className="pr-6">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg glass-subtle hover:bg-white/[0.08] transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {fields.map((f, i) => (
            <div key={f.key} className="space-y-1.5">
              <label
                htmlFor={`pf-${f.key}`}
                className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center justify-between"
              >
                <span>
                  {f.label}
                  {f.required && <span className="text-red-400 ml-1">*</span>}
                </span>
                {f.hint && <span className="normal-case tracking-normal text-[10px]">{f.hint}</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  id={`pf-${f.key}`}
                  ref={i === 0 ? (el) => void (firstRef.current = el) : undefined}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
              ) : f.type === "select" ? (
                <select
                  id={`pf-${f.key}`}
                  ref={i === 0 ? (el) => void (firstRef.current = el) : undefined}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value} className="bg-background">
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`pf-${f.key}`}
                  ref={i === 0 ? (el) => void (firstRef.current = el) : undefined}
                  type={f.type ?? "text"}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              )}
            </div>
          ))}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 pt-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="glass-subtle px-4 py-2 rounded-xl text-sm hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center gap-2",
              confirmBtn,
            )}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
