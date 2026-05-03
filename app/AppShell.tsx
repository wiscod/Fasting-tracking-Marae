"use client";

import { useState } from "react";
import { HistoryScreen } from "@/components/HistoryScreen";
import { HomeScreen } from "@/components/HomeScreen";
import { TabBar, type TabId } from "@/components/TabBar";
import { TeamView } from "@/components/TeamView";
import { tokens } from "@/lib/tokens";

export function AppShell() {
  const [tab, setTab] = useState<TabId>("home");
  const t = tokens("light");

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100dvh",
        maxWidth: 480,
        margin: "0 auto",
        background: t.paper,
        paddingBottom: "calc(70px + env(safe-area-inset-bottom))",
      }}
    >
      {tab === "home" ? <HomeScreen t={t} /> : null}
      {tab === "history" ? <HistoryScreen t={t} /> : null}
      {tab === "team" ? <TeamView t={t} /> : null}
      <TabBar tab={tab} setTab={setTab} t={t} />
    </div>
  );
}
