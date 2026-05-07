import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }
  const { userId, isDirigent } = raw as Record<string, unknown>;
  if (typeof userId !== "string" || userId === "") {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }
  if (typeof isDirigent !== "boolean") {
    return NextResponse.json({ error: "isDirigent (boolean) requis" }, { status: 400 });
  }

  const sb = getSupabaseService();
  const { error } = await sb
    .from("profiles")
    .update({ is_dirigeant: isDirigent })
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
