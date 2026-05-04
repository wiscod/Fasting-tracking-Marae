"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getOrCreateWeeklyFast,
  getTeamForWeek,
  getWeeklyFastSubjects,
  type TeamMember,
} from "@/lib/data";
import { getDeviceId } from "@/lib/deviceId";
import { fmtMin } from "@/lib/format";
import { FONT_STACK, type Tokens } from "@/lib/tokens";
import type { WeeklyFastSubject } from "@/lib/types";
import { getIsoWeek } from "@/lib/week";

type SubjectTotal = {
  subject: WeeklyFastSubject;
  imp: number;
  min: number;
  topName: string;
};

export function TeamView({ t }: { t: Tokens }) {
  const cur = useMemo(() => getIsoWeek(), []);
  const [subjects, setSubjects] = useState<WeeklyFastSubject[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const wf = await getOrCreateWeeklyFast(cur.year, cur.week);
        const [subs, tm] = await Promise.all([
          getWeeklyFastSubjects(wf.id),
          getTeamForWeek(wf.id),
        ]);
        if (cancelled) return;
        setSubjects(subs);
        setTeam(tm);
        setLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(messageOf(e));
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [cur.year, cur.week]);

  const myDeviceId = typeof window !== "undefined" ? getDeviceId() : "";

  const totals: SubjectTotal[] = subjects.map((sub) => {
    let imp = 0;
    let min = 0;
    let top = { name: "—", val: 0 };
    for (const m of team) {
      const v = m.values[sub.id];
      if (!v) continue;
      imp += v.intercessions;
      min += v.prayerMinutes;
      const score = v.intercessions + v.prayerMinutes / 30;
      if (score > top.val) {
        top = {
          name: m.device_id === myDeviceId ? "Toi" : (m.user_name ?? "Anon"),
          val: score,
        };
      }
    }
    return { subject: sub, imp, min, topName: top.name };
  });

  const teamImp = totals.reduce((s, x) => s + x.imp, 0);
  const teamMin = totals.reduce((s, x) => s + x.min, 0);

  return (
    <div style={{ background: t.paper }}>
      <div style={{ padding: "24px 24px 8px" }}>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: t.muted,
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Équipe · Sem {cur.week}</span>
          <span style={{ color: t.accent }}>
            {team.length} pers.
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1,
            color: t.ink,
            letterSpacing: "-0.035em",
          }}
        >
          Trois
          <br />
          <span style={{ color: t.accent }}>fardeaux.</span>
        </div>
      </div>

      <div
        style={{
          margin: "20px 24px 0",
          padding: "16px 0",
          borderTop: `1px solid ${t.line}`,
          borderBottom: `1px solid ${t.line}`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        <StatBlock
          t={t}
          label="Total importunités"
          value={String(teamImp)}
        />
        <StatBlock
          t={t}
          label="Total prière"
          value={fmtMin(teamMin)}
          bordered
        />
      </div>

      {loading ? (
        <p
          style={{
            padding: "20px 24px",
            color: t.muted,
            fontFamily: FONT_STACK,
            fontSize: 13,
          }}
        >
          Chargement…
        </p>
      ) : error ? (
        <p
          style={{
            padding: "20px 24px",
            color: "oklch(0.55 0.18 25)",
            fontFamily: FONT_STACK,
            fontSize: 13,
          }}
        >
          {error}
        </p>
      ) : (
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {totals.map((it) => (
            <SubjectTeamCard
              key={it.subject.id}
              t={t}
              total={it}
              team={team}
              myDeviceId={myDeviceId}
              picked={picked === it.subject.id}
              onToggle={() =>
                setPicked(picked === it.subject.id ? null : it.subject.id)
              }
            />
          ))}
        </div>
      )}

      <div
        style={{
          padding: "28px 24px 40px",
          textAlign: "center",
          fontFamily: FONT_STACK,
          fontSize: 14,
          color: t.muted,
        }}
      >
        « On porte mieux les fardeaux à plusieurs. »
      </div>
    </div>
  );
}

function StatBlock({
  t,
  label,
  value,
  bordered,
}: {
  t: Tokens;
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div
      style={{
        paddingLeft: bordered ? 14 : 0,
        borderLeft: bordered ? `1px solid ${t.line}` : "none",
      }}
    >
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: t.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1,
          color: t.ink,
          letterSpacing: "-0.025em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SubjectTeamCard({
  t,
  total,
  team,
  myDeviceId,
  picked,
  onToggle,
}: {
  t: Tokens;
  total: SubjectTotal;
  team: TeamMember[];
  myDeviceId: string;
  picked: boolean;
  onToggle: () => void;
}) {
  const sub = total.subject;
  const max = Math.max(
    1,
    ...team.map((p) => {
      const v = p.values[sub.id];
      return v ? v.intercessions + v.prayerMinutes / 30 : 0;
    }),
  );

  return (
    <div
      style={{
        padding: "16px 18px",
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 16,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "block",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              fontFamily: FONT_STACK,
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1,
              color: t.accent,
              letterSpacing: "-0.02em",
              minWidth: 24,
            }}
          >
            {sub.position}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONT_STACK,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: t.muted,
              }}
            >
              Sujet {sub.position}
            </div>
            <div
              style={{
                marginTop: 3,
                fontFamily: FONT_STACK,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.25,
                color: t.ink,
                letterSpacing: "-0.01em",
              }}
            >
              {sub.label}
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 16,
                fontFamily: FONT_STACK,
                fontSize: 12,
                color: t.muted,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>
                <b style={{ color: t.ink, fontWeight: 500 }}>{total.imp}</b>{" "}
                imp.
              </span>
              <span>
                <b style={{ color: t.ink, fontWeight: 500 }}>
                  {fmtMin(total.min)}
                </b>{" "}
                de prière
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: FONT_STACK,
                fontSize: 13,
                color: t.muted,
              }}
            >
              en tête : <span style={{ color: t.ink }}>{total.topName}</span>
            </div>
          </div>
          <div
            style={{
              fontFamily: FONT_STACK,
              fontSize: 14,
              color: t.muted,
              transform: picked ? "rotate(180deg)" : "rotate(0)",
              transition: "transform .2s",
            }}
          >
            ⌄
          </div>
        </div>
      </button>

      {picked ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${t.line}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[...team]
            .map((p) => {
              const v = p.values[sub.id] ?? {
                intercessions: 0,
                prayerMinutes: 0,
              };
              return {
                p,
                v,
                score: v.intercessions + v.prayerMinutes / 30,
              };
            })
            .sort((a, b) => b.score - a.score)
            .map(({ p, v, score }) => {
              const isMe = p.device_id === myDeviceId;
              const w = max ? score / max : 0;
              const display = isMe ? "Toi" : (p.user_name ?? "Anon");
              return (
                <div
                  key={p.device_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 90px",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_STACK,
                      fontSize: 15,
                      fontWeight: 600,
                      color: isMe ? t.accent : t.ink,
                      fontStyle: isMe ? "italic" : "normal",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {display}
                  </div>
                  <div
                    style={{
                      position: "relative",
                      height: 6,
                      background: `color-mix(in oklch, ${t.ink} 6%, transparent)`,
                      borderRadius: 999,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${w * 100}%`,
                        background: isMe ? t.accent : t.ink,
                        borderRadius: 999,
                        transition: "width .3s",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontFamily: FONT_STACK,
                      fontSize: 11,
                      color: t.muted,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {v.intercessions} · {fmtMin(v.prayerMinutes)}
                  </div>
                </div>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Erreur inconnue";
}
