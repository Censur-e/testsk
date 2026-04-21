"use client"

import { cn } from "@/lib/utils"
import { useStats } from "@/lib/api"
import {
  LayoutDashboard,
  Users,
  Globe2,
  Coins,
  Terminal,
  Zap,
  Settings,
  LifeBuoy,
  FileCode,
} from "lucide-react"

export type ViewKey =
  | "dashboard"
  | "players"
  | "world"
  | "economy"
  | "executor"
  | "triggers"
  | "integration"

type Props = {
  active: ViewKey
  onChange: (v: ViewKey) => void
}

const navItems: { key: ViewKey; label: string; icon: React.ElementType; badge?: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "players", label: "Joueurs", icon: Users },
  { key: "world", label: "Contrôle du Monde", icon: Globe2, badge: "Nouveau" },
  { key: "economy", label: "Économie", icon: Coins, badge: "Nouveau" },
  { key: "executor", label: "Exécuteur Lua", icon: Terminal },
  { key: "triggers", label: "Triggers", icon: Zap, badge: "Nouveau" },
  { key: "integration", label: "Intégration Roblox", icon: FileCode, badge: "Script" },
]

export function SkydriveSidebar({ active, onChange }: Props) {
  const { stats } = useStats()
  const online = stats?.online ?? false
  const jobId = stats?.server?.jobId ? stats.server.jobId.slice(0, 6) : "------"
  const count = stats?.counts.players ?? 0
  const max = stats?.server?.maxPlayers ?? 30
  const ping = stats?.avgPing ?? 0

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 glass rounded-2xl m-4 mr-0 p-4 relative z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="relative">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center glow-primary">
            <CloudLogo />
          </div>
        </div>
        <div>
          <div className="font-semibold text-base tracking-tight leading-none">
            Skydrive
          </div>
          <div className="text-[11px] text-muted-foreground tracking-wider uppercase mt-1">
            Panel · v2.4
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-3 mb-2 font-medium">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                "hover:bg-white/5",
                isActive &&
                  "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground border border-white/10 glow-primary",
                !isActive && "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] bg-gradient-to-b from-primary to-accent rounded-r-full" />
              )}
              <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/30 uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-1">
        <div className="h-px bg-white/5 my-3" />
        <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <Settings className="h-4 w-4" />
          Paramètres
        </button>
        <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <LifeBuoy className="h-4 w-4" />
          Support
        </button>

        {/* Server status card */}
        <div className="mt-3 glass-subtle rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Serveur
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  online ? "bg-green-400 pulse-dot" : "bg-orange-400",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  online ? "text-green-400" : "text-orange-400",
                )}
              >
                {online ? "Live" : "Offline"}
              </span>
            </span>
          </div>
          <div className="text-xs font-mono text-foreground/80">JobId-{jobId}</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {count}/{max} joueurs · {ping}ms
          </div>
        </div>
      </div>
    </aside>
  )
}

function CloudLogo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white"
    >
      <path
        d="M7 18C4.79086 18 3 16.2091 3 14C3 12.0221 4.43457 10.3793 6.32468 10.0549C6.61953 7.19028 9.0448 5 12 5C14.9552 5 17.3805 7.19028 17.6753 10.0549C19.5654 10.3793 21 12.0221 21 14C21 16.2091 19.2091 18 17 18H7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M9 13L12 10L15 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
