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
        fastEndDate: e.fast_end_date,
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
      .select("id, user_id, kind, global_hours, updated_at, fast_date, fast_end_date")
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
      totalImportunites: number; totalMinutes: number; totalDays: number; lastSeen: string;
    }>();
    for (const e of cast) {
      const entrySubs = subsByEntry.get(e.id) ?? [];
      const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
      const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
      const gm = e.global_hours != null ? Number(e.global_hours) : null;
      const min = gm != null && Number.isFinite(gm) ? gm : perSub;
      const days = (e.fast_date && e.fast_end_date)
        ? Math.max(1, Math.round((new Date(e.fast_end_date).getTime() - new Date(e.fast_date).getTime()) / 86400000) + 1)
        : 1;
      const existing = statsByUser.get(e.user_id);
      if (existing) {
        existing.totalFasts += 1;
        existing.totalTeamFasts += e.kind === "team" ? 1 : 0;
        existing.totalPersonalFasts += e.kind === "personal" ? 1 : 0;
        existing.totalImportunites += imp;
        existing.totalMinutes += min;
        existing.totalDays += days;
        if (e.updated_at > existing.lastSeen) existing.lastSeen = e.updated_at;
      } else {
        statsByUser.set(e.user_id, {
          totalFasts: 1,
          totalTeamFasts: e.kind === "team" ? 1 : 0,
          totalPersonalFasts: e.kind === "personal" ? 1 : 0,
          totalImportunites: imp,
          totalMinutes: min,
          totalDays: days,
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
        totalDays: stats?.totalDays ?? 0,
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
    let totalImportunites = 0, totalMinutes = 0, totalTeamFasts = 0, totalPersonalFasts = 0, totalDays = 0;
    const personalSubjectsSet = new Set<string>();
    const userName = fullName(profilesMap.get(body.userId));
    const mapped = cast.map((e) => {
      const entrySubs = subsByEntry.get(e.id) ?? [];
      const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
      const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
      const gm = e.global_hours != null ? Number(e.global_hours) : null;
      const min = gm != null && Number.isFinite(gm) ? gm : perSub;
      const days = (e.fast_date && e.fast_end_date)
        ? Math.max(1, Math.round((new Date(e.fast_end_date).getTime() - new Date(e.fast_date).getTime()) / 86400000) + 1)
        : 1;
      totalImportunites += imp; totalMinutes += min; totalDays += days;
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
        fastEndDate: e.fast_end_date,
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
        totalDays,
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

    // Helper: compute ISO year+week from a date string
    function isoWeekOf(dateStr: string): { year: number; week: number } {
      const d = new Date(dateStr + "T00:00:00Z");
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return { year: d.getUTCFullYear(), week };
    }

    // Helper: Monday date string of a given ISO year+week
    function weekStartDate(y: number, w: number): string {
      const jan4 = new Date(Date.UTC(y, 0, 4));
      const startOfW1 = new Date(jan4);
      startOfW1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));
      const d = new Date(startOfW1);
      d.setUTCDate(startOfW1.getUTCDate() + (w - 1) * 7);
      return d.toISOString().slice(0, 10);
    }

    const inRange = (y: number, w: number) => {
      const from = fromYear! * 100 + fromWeek!;
      const to = toYear! * 100 + toWeek!;
      const cur = y * 100 + w;
      return cur >= from && cur <= to;
    };

    const dateFrom = weekStartDate(fromYear!, fromWeek!);
    // Sunday of last week = Monday + 6 days
    const lastMonday = new Date(weekStartDate(toYear!, toWeek!) + "T00:00:00Z");
    lastMonday.setUTCDate(lastMonday.getUTCDate() + 6);
    const dateTo = lastMonday.toISOString().slice(0, 10);

    // Fetch team fasts via weekly_fast_id
    const { data: wfs } = await sb.from("weekly_fasts").select("id, year, week");
    const wfsInRange = ((wfs ?? []) as WeeklyFast[]).filter((wf) => inRange(wf.year, wf.week));
    const wfIds = wfsInRange.map((wf) => wf.id);
    const wfById = new Map(wfsInRange.map((wf) => [wf.id, wf]));

    const [teamEntriesRes, personalEntriesRes] = await Promise.all([
      wfIds.length
        ? sb.from("fast_entries").select("id, kind, global_hours, weekly_fast_id, fast_date").in("weekly_fast_id", wfIds)
        : Promise.resolve({ data: [] }),
      sb.from("fast_entries").select("id, kind, global_hours, weekly_fast_id, fast_date")
        .is("weekly_fast_id", null)
        .gte("fast_date", dateFrom)
        .lte("fast_date", dateTo),
    ]);

    const cast = [...((teamEntriesRes.data ?? []) as FastEntry[]), ...((personalEntriesRes.data ?? []) as FastEntry[])];
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

    function getOrCreateBucket(y: number, w: number) {
      const key = `${y}-${w}`;
      if (!aggMap.has(key)) aggMap.set(key, { year: y, week: w, label: `S${w}`, teamCount: 0, personalCount: 0, totalImportunites: 0, totalMinutes: 0 });
      return aggMap.get(key)!;
    }

    for (const e of cast) {
      let agg;
      if (e.weekly_fast_id) {
        const wf = wfById.get(e.weekly_fast_id);
        if (!wf) continue;
        agg = getOrCreateBucket(wf.year, wf.week);
      } else if (e.fast_date) {
        const { year: wy, week: ww } = isoWeekOf(e.fast_date);
        if (!inRange(wy, ww)) continue;
        agg = getOrCreateBucket(wy, ww);
      } else continue;

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