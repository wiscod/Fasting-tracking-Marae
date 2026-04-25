import { getSupabase } from "./supabase";
import type {
  FastEntry,
  FastEntrySubject,
  WeeklyFast,
  WeeklyFastSubject,
} from "./types";

export async function getOrCreateWeeklyFast(
  year: number,
  week: number,
): Promise<WeeklyFast> {
  const sb = getSupabase();
  const existing = await sb
    .from("weekly_fasts")
    .select("*")
    .eq("year", year)
    .eq("week", week)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as WeeklyFast;

  const created = await sb
    .from("weekly_fasts")
    .insert({ year, week, title: `Jeûne d'équipe — Sem ${week}` })
    .select("*")
    .single();
  if (created.error) throw created.error;
  return created.data as WeeklyFast;
}

export async function getWeeklyFastSubjects(
  weeklyFastId: string,
): Promise<WeeklyFastSubject[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("weekly_fast_subjects")
    .select("*")
    .eq("weekly_fast_id", weeklyFastId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyFastSubject[];
}

export async function getTeamFastEntry(
  deviceId: string,
  weeklyFastId: string,
): Promise<{ entry: FastEntry | null; subjects: FastEntrySubject[] }> {
  const sb = getSupabase();
  const { data: entry, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("device_id", deviceId)
    .eq("weekly_fast_id", weeklyFastId)
    .eq("kind", "team")
    .maybeSingle();
  if (error) throw error;
  if (!entry) return { entry: null, subjects: [] };

  const { data: subs, error: subErr } = await sb
    .from("fast_entry_subjects")
    .select("*")
    .eq("fast_entry_id", entry.id)
    .order("position", { ascending: true });
  if (subErr) throw subErr;
  return {
    entry: entry as FastEntry,
    subjects: (subs ?? []) as FastEntrySubject[],
  };
}

export type SubjectInput = {
  weekly_fast_subject_id: string | null;
  custom_label: string | null;
  intercessions: number;
  hours: number;
  position: number;
};

export async function saveTeamFastEntry(args: {
  deviceId: string;
  userName: string | null;
  weeklyFastId: string;
  globalHours: number | null;
  subjects: SubjectInput[];
}): Promise<FastEntry> {
  const sb = getSupabase();

  let entryId: string;
  const existing = await sb
    .from("fast_entries")
    .select("id")
    .eq("device_id", args.deviceId)
    .eq("weekly_fast_id", args.weeklyFastId)
    .eq("kind", "team")
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    entryId = existing.data.id;
    const upd = await sb
      .from("fast_entries")
      .update({
        user_name: args.userName,
        global_hours: args.globalHours,
      })
      .eq("id", entryId);
    if (upd.error) throw upd.error;
  } else {
    const ins = await sb
      .from("fast_entries")
      .insert({
        device_id: args.deviceId,
        user_name: args.userName,
        kind: "team",
        weekly_fast_id: args.weeklyFastId,
        in_team_fast: true,
        global_hours: args.globalHours,
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    entryId = ins.data.id;
  }

  const del = await sb
    .from("fast_entry_subjects")
    .delete()
    .eq("fast_entry_id", entryId);
  if (del.error) throw del.error;

  if (args.subjects.length > 0) {
    const rows = args.subjects.map((s) => ({ ...s, fast_entry_id: entryId }));
    const insSubs = await sb.from("fast_entry_subjects").insert(rows);
    if (insSubs.error) throw insSubs.error;
  }

  const finalEntry = await sb
    .from("fast_entries")
    .select("*")
    .eq("id", entryId)
    .single();
  if (finalEntry.error) throw finalEntry.error;
  return finalEntry.data as FastEntry;
}

export async function listPersonalFasts(
  deviceId: string,
): Promise<FastEntry[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("device_id", deviceId)
    .eq("kind", "personal")
    .order("fast_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FastEntry[];
}

export async function getPersonalFast(
  id: string,
): Promise<{ entry: FastEntry | null; subjects: FastEntrySubject[] }> {
  const sb = getSupabase();
  const { data: entry, error } = await sb
    .from("fast_entries")
    .select("*")
    .eq("id", id)
    .eq("kind", "personal")
    .maybeSingle();
  if (error) throw error;
  if (!entry) return { entry: null, subjects: [] };
  const { data: subs, error: subErr } = await sb
    .from("fast_entry_subjects")
    .select("*")
    .eq("fast_entry_id", entry.id)
    .order("position", { ascending: true });
  if (subErr) throw subErr;
  return {
    entry: entry as FastEntry,
    subjects: (subs ?? []) as FastEntrySubject[],
  };
}

export async function savePersonalFast(args: {
  id?: string;
  deviceId: string;
  userName: string | null;
  title: string;
  fastDate: string | null;
  inTeamFast: boolean;
  weeklyFastId: string | null;
  globalHours: number | null;
  subjects: SubjectInput[];
}): Promise<FastEntry> {
  const sb = getSupabase();
  let entryId: string;

  if (args.id) {
    entryId = args.id;
    const upd = await sb
      .from("fast_entries")
      .update({
        user_name: args.userName,
        title: args.title,
        fast_date: args.fastDate,
        in_team_fast: args.inTeamFast,
        weekly_fast_id: args.inTeamFast ? args.weeklyFastId : null,
        global_hours: args.globalHours,
      })
      .eq("id", entryId);
    if (upd.error) throw upd.error;
  } else {
    const ins = await sb
      .from("fast_entries")
      .insert({
        device_id: args.deviceId,
        user_name: args.userName,
        kind: "personal",
        title: args.title,
        fast_date: args.fastDate,
        in_team_fast: args.inTeamFast,
        weekly_fast_id: args.inTeamFast ? args.weeklyFastId : null,
        global_hours: args.globalHours,
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    entryId = ins.data.id;
  }

  const del = await sb
    .from("fast_entry_subjects")
    .delete()
    .eq("fast_entry_id", entryId);
  if (del.error) throw del.error;

  if (args.subjects.length > 0) {
    const rows = args.subjects.map((s) => ({ ...s, fast_entry_id: entryId }));
    const insSubs = await sb.from("fast_entry_subjects").insert(rows);
    if (insSubs.error) throw insSubs.error;
  }

  const finalEntry = await sb
    .from("fast_entries")
    .select("*")
    .eq("id", entryId)
    .single();
  if (finalEntry.error) throw finalEntry.error;
  return finalEntry.data as FastEntry;
}

export async function deletePersonalFast(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("fast_entries").delete().eq("id", id);
  if (error) throw error;
}
