import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
import type { FastEntry, FastEntrySubject } from "@/lib/types";

export async function GET() {
  const sb = getSupabaseService();

  const { data: allProfiles, error: profErr } = await sb
    .from("profiles")
    .select("id, first_name, last_name, is_dirigeant")
    .order("created_at", { ascending: true });
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const { data: entries, error: entErr } = await sb
    .from("fast_entries")
    .select("id, user_id, kind, global_hours, fast_date, fast_end_date");
  if (entErr) return NextResponse.json({ error: entErr.message }, { status: 500 });

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

  const statsByUser = new Map<string, {
    totalFasts: number; totalImportunites: number; totalMinutes: number; totalDays: number; longFasts: number;
  }>();

  for (const e of cast) {
    const entrySubs = subsByEntry.get(e.id) ?? [];
    const imp = entrySubs.reduce((a, s) => a + (s.intercessions || 0), 0);
    const perSub = entrySubs.reduce((a, s) => a + Number(s.hours || 0), 0);
    const gm = e.global_hours != null ? Number(e.global_hours) : null;
    const min = gm != null && Number.isFinite(gm) ? gm : perSub;
    const days = e.fast_date && e.fast_end_date
      ? Math.max(1, Math.round((new Date(e.fast_end_date).getTime() - new Date(e.fast_date).getTime()) / 86400000) + 1)
      : 1;
    const isLongFast = days > 3 ? 1 : 0;
    const existing = statsByUser.get(e.user_id);
    if (existing) {
      existing.totalFasts += 1;
      existing.totalImportunites += imp;
      existing.totalMinutes += min;
      existing.totalDays += days;
      existing.longFasts += isLongFast;
    } else {
      statsByUser.set(e.user_id, { totalFasts: 1, totalImportunites: imp, totalMinutes: min, totalDays: days, longFasts: isLongFast });
    }
  }

  const result = (allProfiles ?? []).map((p: { id: string; first_name: string; last_name: string | null; is_dirigeant: boolean }) => {
    const stats = statsByUser.get(p.id);
    const name = p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name;
    return {
      userId: p.id,
      name,
      isDirigent: p.is_dirigeant,
      totalFasts: stats?.totalFasts ?? 0,
      totalImportunites: stats?.totalImportunites ?? 0,
      totalMinutes: stats?.totalMinutes ?? 0,
      totalDays: stats?.totalDays ?? 0,
      longFasts: stats?.longFasts ?? 0,
    };
  });

  return NextResponse.json(result.sort((a, b) => b.totalImportunites - a.totalImportunites));
}