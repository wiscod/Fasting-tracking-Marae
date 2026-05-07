import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabaseServer";
import type {
  FastEntry,
  FastEntrySubject,
  WeeklyFast,
} from "@/lib/types";

// Middleware already gates /api/admin/* via the HMAC cookie.

type Body = {
  action: string;
  weeklyFastId?: string;
  userId?: string;
  entryId?: string;
  fromYear?: number;
  fromWeek?: number;
  toYear?: number;
  toWeek?: number;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const sb = getSupabaseService();

  // Map of user_id → profile (first_name, last_name, phone, is_dirigeant)
  async function loadProfiles(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, { first_name: string; last_name: string | null; phone: string; is_dirigeant: boolean }>();
    const { data } = await sb
      .from("profiles")
      .select("id, first_name, last_name, phone, is_dirigeant")
      .in("id", userIds);
    return new Map(
      (data ?? []).map((p: { id: string; first_name: string; last_name: string | null; phone: string; is_dirigeant: boolean }) => [p.id, p]),
    );
  }

  function fullName(p?: { first_name: string; last_name: string | null }) {
    if (!p) return null;
    return p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name;
  }

  if (body.action === "getWeeklyParticipants") {
    if (!body.weeklyFastId) return NextResponse.json({ error: "weeklyFastId requis" }, { status: 400 });
    const { data: entries, error } = await sb
      .from("fast_entries")
      .select("*")
      .eq("weekly_fast_id", body.weeklyFastId)
      .order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const cast = (entries ?? []) as FastEntry[];
    const ids = cast.map((e) => e.id);
    const { data: subs } = ids.length
      ? await sb.from("fast_entry_subjects").select("*").in("fast_entry_id", ids)
      : { data: [] };
    const subsByEntry = new Map<string, FastEntrySubject[]>();
    for (const s of (subs ?? []) as FastEntrySubject[]) {
      const list = subsByEntry.get(s.fast_entry_id) ?? [];
      list.push(s);
      subsByEntry.set(s.fast_entry_id, list);
    }
    const profiles = await loadProfiles([...new Set(cast.map((e) => e.user_id))]);
    const out = cast.map((e) => {
      const entrySubs = subsByEntry.get(e.id) ?? [];
      const totalIntercessions = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
      const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
      const gm = e.global_hours != null ? Number(e.global_hours) : null;
      const totalMinutes = gm != null && Number.isFinite(gm) ? gm : perSub;
      return {
        entryId: e.id,
        userId: e.user_id,
        userName: fullName(profiles.get(e.user_id)),
        kind: e.kind,
        fastDate: e.fast_date,
        globalMinutes: gm,
        updatedAt: e.updated_at,
        totalIntercessions,
        totalMinutes,
        bySubject: entrySubs.map((s) => ({
          weekly_fast_subject_id: s.weekly_fast_subject_id,
          custom_label: s.custom_label,
          intercessions: s.intercessions || 0,
          minutes: Number(s.hours || 0),
        })),
      };
    });
    return NextResponse.json(out);
  }

  if (body.action === "getAllPersons") {
    // Start from profiles so all registered users appear, even with no fasts
    const { data: allProfiles, error: profErr } = await sb
      .from("profiles")
      .select("id, first_name, last_name, phone, is_dirigeant")
      .order("created_at", { ascending: true });
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

    const { data: entries, error } = await sb
      .from("fast_entries")
      .select("id, user_id, kind, global_hours, updated_at")
      .order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const cast = (entries ?? []) as FastEntry[];
    const ids = cast.map((e) => e.id);
    const { data: subs } = ids.length
      ? await sb.from("fast_entry_subjects").select("fast_entry_id, intercessions, hours").in("fast_entry_id", ids)
      : { data: [] };
    const subsByEntry = new Map<string, { intercessions: number; hours: number }[]>();
    for (const s of (subs ?? []) as FastEntrySubject[]) {
      const list = subsByEntry.get(s.fast_entry_id) ?? [];
      list.push(s);
      subsByEntry.set(s.fast_entry_id, list);
    }

    // Aggregate fast stats per user
    const statsByUser = new Map<string, {
      totalFasts: number; totalTeamFasts: number; totalPersonalFasts: number;
      totalImportunites: number; totalMinutes: number; lastSeen: string;
    }>();
    for (const e of cast) {
      const entrySubs = subsByEntry.get(e.id) ?? [];
      const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
      const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
      const gm = e.global_hours != null ? Number(e.global_hours) : null;
      const min = gm != null && Number.isFinite(gm) ? gm : perSub;
      const existing = statsByUser.get(e.user_id);
      if (existing) {
        existing.totalFasts += 1;
        existing.totalTeamFasts += e.kind === "team" ? 1 : 0;
        existing.totalPersonalFasts += e.kind === "personal" ? 1 : 0;
        existing.totalImportunites += imp;
        existing.totalMinutes += min;
        if (e.updated_at > existing.lastSeen) existing.lastSeen = e.updated_at;
      } else {
        statsByUser.set(e.user_id, {
          totalFasts: 1,
          totalTeamFasts: e.kind === "team" ? 1 : 0,
          totalPersonalFasts: e.kind === "personal" ? 1 : 0,
          totalImportunites: imp,
          totalMinutes: min,
          lastSeen: e.updated_at,
        });
      }
    }

    const result = (allProfiles ?? []).map((p: { id: string; first_name: string; last_name: string | null; phone: string; is_dirigeant: boolean }) => {
      const stats = statsByUser.get(p.id);
      return {
        userId: p.id,
        userName: fullName(p),
        phone: p.phone,
        isDirigent: p.is_dirigeant,
        totalFasts: stats?.totalFasts ?? 0,
        totalTeamFasts: stats?.totalTeamFasts ?? 0,
        totalPersonalFasts: stats?.totalPersonalFasts ?? 0,
        totalImportunites: stats?.totalImportunites ?? 0,
        totalMinutes: stats?.totalMinutes ?? 0,
        lastSeen: stats?.lastSeen ?? "",
      };
    });

    return NextResponse.json(result.sort((a, b) => b.totalImportunites - a.totalImportunites));
  }

  if (body.action === "getPersonHistory") {
    if (!body.userId) return NextResponse.json({ error: "userId requis" }, { status: 400 });
    const { data: entries, error } = await sb
      .from("fast_entries")
      .select("*")
      .eq("user_id", body.userId)
      .order("fast_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const cast = (entries ?? []) as FastEntry[];
    const ids = cast.map((e) => e.id);
    const [subsRes, wfRes, profilesMap] = await Promise.all([
      ids.length
        ? sb.from("fast_entry_subjects").select("*").in("fast_entry_id", ids)
        : Promise.resolve({ data: [] as FastEntrySubject[], error: null }),
      sb.from("weekly_fasts").select("id, year, week"),
      loadProfiles([body.userId]),
    ]);
    const wfMap = new Map<string, { year: number; week: number }>();
    for (const wf of (wfRes.data ?? []) as WeeklyFast[]) {
      wfMap.set(wf.id, { year: wf.year, week: wf.week });
    }
    const subsByEntry = new Map<string, FastEntrySubject[]>();
    for (const s of (subsRes.data ?? []) as FastEntrySubject[]) {
      const list = subsByEntry.get(s.fast_entry_id) ?? [];
      list.push(s);
      subsByEntry.set(s.fast_entry_id, list);
    }
    let totalImportunites = 0, totalMinutes = 0, totalTeamFasts = 0, totalPersonalFasts = 0;
    const personalSubjectsSet = new Set<string>();
    const userName = fullName(profilesMap.get(body.userId));
    const mapped = cast.map((e) => {
      const entrySubs = subsByEntry.get(e.id) ?? [];
      const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
      const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
      const gm = e.global_hours != null ? Number(e.global_hours) : null;
      const min = gm != null && Number.isFinite(gm) ? gm : perSub;
      totalImportunites += imp; totalMinutes += min;
      if (e.kind === "team") totalTeamFasts++; else {
        totalPersonalFasts++;
        for (const s of entrySubs) if (s.custom_label?.trim()) personalSubjectsSet.add(s.custom_label.trim());
      }
      const wf = e.weekly_fast_id ? wfMap.get(e.weekly_fast_id) : null;
      return {
        entryId: e.id,
        userId: e.user_id,
        userName,
        kind: e.kind,
        fastDate: e.fast_date,
        globalMinutes: gm,
        updatedAt: e.updated_at,
        totalIntercessions: imp,
        totalMinutes: min,
        weekLabel: wf ? `Sem ${wf.week} (${wf.year})` : null,
        weeklyFastId: e.weekly_fast_id,
        bySubject: entrySubs.map((s) => ({
          weekly_fast_subject_id: s.weekly_fast_subject_id,
          custom_label: s.custom_label,
          intercessions: s.intercessions || 0,
          minutes: Number(s.hours || 0),
        })),
      };
    });
    const profile = profilesMap.get(body.userId);
    return NextResponse.json({
      person: {
        userId: body.userId,
        userName,
        phone: profile?.phone ?? null,
        isDirigent: profile?.is_dirigeant ?? false,
        totalFasts: cast.length,
        totalTeamFasts,
        totalPersonalFasts,
        totalImportunites,
        totalMinutes,
        lastSeen: cast[0]?.updated_at ?? "",
      },
      entries: mapped,
      personalSubjects: [...personalSubjectsSet],
    });
  }

  if (body.action === "getWeeklyAggregates") {
    const { fromYear, fromWeek, toYear, toWeek } = body;
    if ([fromYear, fromWeek, toYear, toWeek].some((v) => typeof v !== "number")) {
      return NextResponse.json({ error: "Plage requise" }, { status: 400 });
    }
    const { data: wfs } = await sb.from("weekly_fasts").select("id, year, week");
    const inRange = (y: number, w: number) => {
      const from = fromYear! * 100 + fromWeek!;
      const to = toYear! * 100 + toWeek!;
      const cur = y * 100 + w;
      return cur >= from && cur <= to;
    };
    const wfsInRange = ((wfs ?? []) as WeeklyFast[]).filter((wf) => inRange(wf.year, wf.week));
    const wfIds = wfsInRange.map((wf) => wf.id);
    const wfById = new Map(wfsInRange.map((wf) => [wf.id, wf]));
    const { data: entries } = await sb
      .from("fast_entries")
      .select("id, kind, global_hours, weekly_fast_id")
      .in("weekly_fast_id", wfIds.length ? wfIds : ["none"]);
    const cast = (entries ?? []) as FastEntry[];
    const ids = cast.map((e) => e.id);
    const { data: subs } = ids.length
      ? await sb.from("fast_entry_subjects").select("fast_entry_id, intercessions, hours").in("fast_entry_id", ids)
      : { data: [] };
    const subsByEntry = new Map<string, { intercessions: number; hours: number }[]>();
    for (const s of (subs ?? []) as FastEntrySubject[]) {
      const list = subsByEntry.get(s.fast_entry_id) ?? [];
      list.push(s); subsByEntry.set(s.fast_entry_id, list);
    }
    const aggMap = new Map<string, {
      year: number; week: number; label: string;
      teamCount: number; personalCount: number;
      totalImportunites: number; totalMinutes: number;
    }>();
    for (const wf of wfsInRange) {
      aggMap.set(`${wf.year}-${wf.week}`, {
        year: wf.year, week: wf.week, label: `S${wf.week}`,
        teamCount: 0, personalCount: 0, totalImportunites: 0, totalMinutes: 0,
      });
    }
    for (const e of cast) {
      const wf = e.weekly_fast_id ? wfById.get(e.weekly_fast_id) : null;
      if (!wf) continue;
      const agg = aggMap.get(`${wf.year}-${wf.week}`);
      if (!agg) continue;
      const entrySubs = subsByEntry.get(e.id) ?? [];
      const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
      const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
      const gm = e.global_hours != null ? Number(e.global_hours) : null;
      const min = gm != null && Number.isFinite(gm) ? gm : perSub;
      if (e.kind === "team") agg.teamCount++; else agg.personalCount++;
      agg.totalImportunites += imp;
      agg.totalMinutes += min;
    }
    return NextResponse.json(
      [...aggMap.values()].sort((a, b) => (a.year * 100 + a.week) - (b.year * 100 + b.week)),
    );
  }

  if (body.action === "deleteEntry") {
    if (!body.entryId) return NextResponse.json({ error: "entryId requis" }, { status: 400 });
    await sb.from("fast_entry_subjects").delete().eq("fast_entry_id", body.entryId);
    const { error } = await sb.from("fast_entries").delete().eq("id", body.entryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
