"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Globe2,
  Coins,
  Terminal,
  Zap,
} from "lucide-react"
import type { ViewKey } from "./skydrive-sidebar"

const items: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dash", icon: LayoutDashboard },
  { key: "players", label: "Joueurs", icon: Users },
  { key: "world", label: "Monde", icon: Globe2 },
  { key: "economy", label: "Eco", icon: Coins },
  { key: "executor", label: "Lua", icon: Terminal },
  { key: "triggers", label: "Triggers", icon: Zap },
]

export function MobileNav({
  active,
  onChange,
}: {
  active: ViewKey
  onChange: (v: ViewKey) => void
}) {
  return (
    <div className="lg:hidden glass rounded-2xl p-1 flex items-center gap-1 overflow-x-auto custom-scrollbar">
      {items.map((it) => {
        const Icon = it.icon
        const isActive = active === it.key
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
              isActive
                ? "bg-gradient-to-r from-primary/20 to-accent/10 border border-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
