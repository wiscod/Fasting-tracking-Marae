import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabaseServer";

// Middleware already gates /api/admin/* via the HMAC cookie.

type Body = {
  action: string;
  id?: string;
  name?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  is_dirigeant?: boolean;
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── createCroisade ──
  if (body.action === "createCroisade") {
    const { name, description, start_date, end_date, is_dirigeant } = body;
    if (!name || !start_date || !end_date)
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    const { data, error } = await sb
      .from("croisades")
      .insert({ name, description: description ?? null, start_date, end_date, is_dirigeant: is_dirigeant ?? false })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── updateCroisade ──
  if (body.action === "updateCroisade") {
    const { id, name, description, start_date, end_date } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { data, error } = await sb
      .from("croisades")
      .update({ name, description: description ?? null, start_date, end_date, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── closeCroisade ──
  if (body.action === "closeCroisade") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { error } = await sb.from("croisades").update({ is_active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({});
  }

  // ── reopenCroisade ──
  if (body.action === "reopenCroisade") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
    const { error } = await sb.from("croisades").update({ is_active: true }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({});
  }

  // ── getCroisadeStats ──
  if (body.action === "getCroisadeStats") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

    // Get the croisade dates first
    const { data: croisade, error: cErr } = await sb
      .from("croisades")
      .select("start_date, end_date")
      .eq("id", id)
      .single();
    if (cErr || !croisade) return NextResponse.json({ error: "Croisade introuvable" }, { status: 404 });

    // Find fast_entries whose fast_date falls within the croisade period
    const { data: entries, error: eErr } = await sb
      .from("fast_entries")
      .select("id, user_id, global_hours")
      .gte("fast_date", croisade.start_date)
      .lte("fast_date", croisade.end_date);
    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

    const entryIds = (entries ?? []).map((e: { id: string }) => e.id);
    const participants = new Set((entries ?? []).map((e: { user_id: string }) => e.user_id)).size;

    let totalMinutes = 0;
    let totalIntercessions = 0;

    if (entryIds.length > 0) {
      const { data: subjects } = await sb
        .from("fast_entry_subjects")
        .select("intercessions, hours")
        .in("fast_entry_id", entryIds);

      (subjects ?? []).forEach((s: { intercessions: number; hours: number }) => {
        totalIntercessions += s.intercessions ?? 0;
        totalMinutes += (s.hours ?? 0) * 60;
      });

      // Also sum global_hours where set
      (entries ?? []).forEach((e: { global_hours: number | null }) => {
        if (e.global_hours != null) totalMinutes += e.global_hours * 60;
      });
    }

    return NextResponse.json({
      totalEntries: entryIds.length,
      totalMinutes,
      totalIntercessions,
      participants,
    });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
