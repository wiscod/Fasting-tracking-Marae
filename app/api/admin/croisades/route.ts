import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabaseServer";

// Middleware already gates /api/admin/* via the HMAC cookie.

type Body = {
  action: string;
  id?: string;
  name?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  is_dirigeant?: boolean;
  subjects?: { position: number; label: string }[];
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const sb = getSupabaseService();

  // ── getAllCroisades ──
  if (body.action === "getAllCroisades") {
    const { data, error } = await sb
      .from("croisades")
      .select("*")
      .order("start_date", { ascending: false });
    if (error) { console.error(error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    return NextResponse.json(data);
  }

  // ── createCroisade ──
  if (body.action === "createCroisade") {
    const { name, description, start_date, end_date, is_dirigeant } = body;
    if (!name || !start_date)
      return NextResponse.json({ error: "Nom et date de début requis" }, { status: 400 });
    const { data, error } = await sb
      .from("croisades")
      .insert({ name, description: description ?? null, start_date, end_date: end_date ?? null, is_dirigeant: is_dirigeant ?? false })
      .select("*")
      .single();
    if (error) { console.error(error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    return NextResponse.json(data);
  }

  // ── updateCroisade ──
  if (body.action === "updateCroisade") {
    const { id, name, description, start_date, end_date } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { data, error } = await sb
      .from("croisades")
      .update({ name, description: description ?? null, start_date, end_date: end_date ?? null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) { console.error(error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    return NextResponse.json(data);
  }

  // ── closeCroisade ──
  if (body.action === "closeCroisade") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { error } = await sb.from("croisades").update({ is_active: false }).eq("id", id);
    if (error) { console.error(error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    return NextResponse.json({});
  }

  // ── reopenCroisade ──
  if (body.action === "reopenCroisade") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { error } = await sb.from("croisades").update({ is_active: true }).eq("id", id);
    if (error) { console.error(error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    return NextResponse.json({});
  }

  // ── getCroisadeStats ──
  if (body.action === "getCroisadeStats") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

    // 1. Get croisade_subjects for this croisade
    const { data: croisadeSubs, error: csErr } = await sb
      .from("croisade_subjects")
      .select("id")
      .eq("croisade_id", id);
    if (csErr) { console.error(csErr); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    const croisadeSubIds = (croisadeSubs ?? []).map((s: { id: string }) => s.id);

    if (croisadeSubIds.length === 0) {
      return NextResponse.json({ totalEntries: 0, totalMinutes: 0, totalIntercessions: 0, participants: 0 });
    }

    // 2. Get fast_entry_subjects linked to those croisade subjects
    const { data: linkedSubs, error: lsErr } = await sb
      .from("fast_entry_subjects")
      .select("fast_entry_id, intercessions, hours, croisade_subject_id")
      .in("croisade_subject_id", croisadeSubIds);
    if (lsErr) { console.error(lsErr); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }

    const entryIds = [...new Set((linkedSubs ?? []).map((s: { fast_entry_id: string }) => s.fast_entry_id))];
    if (entryIds.length === 0) {
      return NextResponse.json({ totalEntries: 0, totalMinutes: 0, totalIntercessions: 0, participants: 0 });
    }

    // 3. Get fast_entries for those ids
    const { data: entries, error: eErr } = await sb
      .from("fast_entries")
      .select("id, user_id, global_hours")
      .in("id", entryIds);
    if (eErr) { console.error(eErr); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }

    const participants = new Set((entries ?? []).map((e: { user_id: string }) => e.user_id)).size;
    const entryMap = new Map((entries ?? []).map((e: { id: string; global_hours: number | null }) => [e.id, e.global_hours]));

    // 4. Compute stats — for each entry use global_hours if set, else sum per-subject hours
    let totalIntercessions = 0;
    const perEntryHours = new Map<string, number>();
    for (const s of (linkedSubs ?? [])) {
      const ls = s as { fast_entry_id: string; intercessions: number; hours: number };
      totalIntercessions += ls.intercessions ?? 0;
      perEntryHours.set(ls.fast_entry_id, (perEntryHours.get(ls.fast_entry_id) ?? 0) + (ls.hours ?? 0));
    }

    let totalMinutes = 0;
    for (const entryId of entryIds) {
      const gh = entryMap.get(entryId);
      totalMinutes += (gh != null ? gh : (perEntryHours.get(entryId) ?? 0)) * 60;
    }

    return NextResponse.json({
      totalEntries: entryIds.length,
      totalMinutes,
      totalIntercessions,
      participants,
    });
  }

  // ── getCroisadeSubjects ──
  if (body.action === "getCroisadeSubjects") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { data, error } = await sb
      .from("croisade_subjects")
      .select("*")
      .eq("croisade_id", id)
      .order("position", { ascending: true });
    if (error) { console.error(error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    return NextResponse.json(data ?? []);
  }

  // ── saveCroisadeSubjects ──
  if (body.action === "saveCroisadeSubjects") {
    const { id, subjects } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { error: delErr } = await sb.from("croisade_subjects").delete().eq("croisade_id", id);
    if (delErr) { console.error(delErr); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    if (subjects && subjects.length > 0) {
      const rows = subjects.map((s) => ({ croisade_id: id, position: s.position, label: s.label }));
      const { error: insErr } = await sb.from("croisade_subjects").insert(rows);
      if (insErr) { console.error(insErr); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
