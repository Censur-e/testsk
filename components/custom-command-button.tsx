"use client"

import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getColor, getIcon } from "@/lib/icon-map"
import { runCustomCommand } from "@/lib/api"
import type { CustomCommand } from "@/lib/types"
import { PromptDialog, type PromptField } from "@/components/prompt-dialog"
import { Loader2 } from "lucide-react"

type Props = {
  command: CustomCommand
  targetId?: string
  targetLabel?: string
  variant?: "grid" | "row"
  className?: string
}

/**
 * Rend un bouton pour une commande personnalisee.
 * - Si la commande a des inputs, ouvre un PromptDialog avant l'execution
 * - Sinon, execute directement (avec confirmation si confirm_required)
 */
export function CustomCommandButton({
  command,
  targetId,
  targetLabel,
  variant = "grid",
  className,
}: Props) {
  const [promptOpen, setPromptOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const color = getColor(command.color)
  const Icon = getIcon(command.icon)

  const hasInputs = command.inputs.length > 0
  const needsConfirm = command.confirmRequired

  const execute = async (values: Record<string, string>) => {
    setSending(true)
    try {
      await runCustomCommand(command, values, targetId)
      toast.success(`"${command.name}" envoyee`, {
        description: targetLabel
          ? `Cible : ${targetLabel} - execution au prochain heartbeat`
          : "Execution au prochain heartbeat",
      })
    } catch (err) {
      toast.error("Echec", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      })
    } finally {
      setSending(false)
    }
  }

  const handleClick = () => {
    if (hasInputs || needsConfirm) {
      setPromptOpen(true)
    } else {
      execute({})
    }
  }

  // Conversion des inputs custom -> champs PromptDialog
  const fields: PromptField[] = command.inputs.map((i) => {
    const base: PromptField = {
      key: i.key,
      label: i.label,
      type:
        i.type === "boolean"
          ? "select"
          : (i.type as "text" | "textarea" | "number" | "select"),
      placeholder: i.placeholder,
      defaultValue: i.defaultValue,
      required: i.required,
      min: i.min,
      max: i.max,
      hint: i.hint,
    }
    if (i.type === "select" && i.options) {
      base.options = i.options
    }
    if (i.type === "boolean") {
      base.options = [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ]
      if (!base.defaultValue) base.defaultValue = "false"
    }
    return base
  })

  if (variant === "row") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={sending}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl glass-subtle hover:bg-white/[0.06] hover:border-white/15 transition-all text-left group disabled:opacity-50",
            className,
          )}
        >
          <span
            className={cn(
              "h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 border",
              color.bg,
              color.border,
            )}
          >
            {sending ? (
              <Loader2 className={cn("h-3.5 w-3.5 animate-spin", color.text)} />
            ) : (
              <Icon className={cn("h-3.5 w-3.5", color.text)} />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{command.name}</div>
            {command.description && (
              <div className="text-[10px] text-muted-foreground truncate">
                {command.description}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {"->"}
          </span>
        </button>

        {(hasInputs || needsConfirm) && (
          <PromptDialog
            open={promptOpen}
            title={command.name}
            description={
              command.description ||
              (needsConfirm && !hasInputs
                ? "Confirme l'execution de cette commande."
                : undefined)
            }
            fields={fields}
            confirmLabel="Executer"
            onClose={() => setPromptOpen(false)}
            onSubmit={execute}
          />
        )}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        title={command.description || command.name}
        className={cn(
          "group flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-gradient-to-b border transition-all hover:scale-[1.03] hover:border-white/20 disabled:opacity-50",
          color.bg,
          color.border,
          className,
        )}
      >
        {sending ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", color.text)} />
        ) : (
          <Icon className={cn("h-4 w-4", color.text)} />
        )}
        <span className="text-[10px] font-medium truncate max-w-[90%]">{command.name}</span>
      </button>

      {(hasInputs || needsConfirm) && (
        <PromptDialog
          open={promptOpen}
          title={command.name}
          description={
            command.description ||
            (needsConfirm && !hasInputs
              ? "Confirme l'execution de cette commande."
              : undefined)
          }
          fields={fields}
          confirmLabel="Executer"
          onClose={() => setPromptOpen(false)}
          onSubmit={execute}
        />
      )}
    </>
  )
}
