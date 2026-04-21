"use client"

import { useState } from "react"
import { AnimatedBackground } from "@/components/animated-background"
import { SkydriveSidebar, type ViewKey } from "@/components/skydrive-sidebar"
import { SkydriveHeader } from "@/components/skydrive-header"
import { DashboardView } from "@/components/views/dashboard-view"
import { PlayersView } from "@/components/views/players-view"
import { WorldControlView } from "@/components/views/world-control-view"
import { EconomyView } from "@/components/views/economy-view"
import { ExecutorView } from "@/components/views/executor-view"
import { TriggersView } from "@/components/views/triggers-view"
import { MobileNav } from "@/components/mobile-nav"

export default function Page() {
  const [view, setView] = useState<ViewKey>("dashboard")

  return (
    <main className="relative min-h-screen text-foreground overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen">
        <SkydriveSidebar active={view} onChange={setView} />

        <div className="flex-1 flex flex-col min-w-0 p-4 lg:pl-4 gap-4">
          <SkydriveHeader />
          <MobileNav active={view} onChange={setView} />

          <div className="flex-1 min-h-0 pb-4">
            {view === "dashboard" && <DashboardView />}
            {view === "players" && <PlayersView />}
            {view === "world" && <WorldControlView />}
            {view === "economy" && <EconomyView />}
            {view === "executor" && <ExecutorView />}
            {view === "triggers" && <TriggersView />}
          </div>
        </div>
      </div>
    </main>
  )
}
