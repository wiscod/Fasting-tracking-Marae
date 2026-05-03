"use client";

import { FONT_STACK, type Tokens } from "@/lib/tokens";

export type TabId = "home" | "history" | "team";

export function TabBar({
  tab,
  setTab,
  t,
}: {
  tab: TabId;
  setTab: (id: TabId) => void;
  t: Tokens;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "home", label: "Enregistrer" },
    { id: "history", label: "Historique" },
    { id: "team", label: "Équipe" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: "calc(18px + env(safe-area-inset-bottom))",
        paddingTop: 10,
        background: `color-mix(in oklch, ${t.surface} 92%, transparent)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${t.line}`,
        display: "flex",
        justifyContent: "space-around",
        zIndex: 10,
      }}
    >
      {tabs.map((x) => {
        const active = tab === x.id;
        return (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "8px 16px",
              fontFamily: FONT_STACK,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: active ? t.ink : t.muted,
              position: "relative",
            }}
          >
            {x.label}
            {active ? (
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: -4,
                  transform: "translateX(-50%)",
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  background: t.accent,
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
