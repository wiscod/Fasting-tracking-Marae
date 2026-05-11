import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { firstName, lastName, phone, email, discipleshipMaker } = await req.json();

  if (!firstName?.trim() || !phone?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Prénom, téléphone et email requis" }, { status: 400 });
  }

  const sb = getSupabaseService();

  const { data: invited, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email.trim(), {
    data: { first_name: firstName.trim() },
  });
  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 400 });
  }

  const userId = invited.user.id;

  const { error: profileErr } = await sb.from("profiles").insert({
    id: userId,
    first_name: firstName.trim(),
    last_name: lastName?.trim() || null,
    phone: phone.trim(),
    discipleship_maker: discipleshipMaker?.trim() || null,
    is_dirigeant: false,
  });

  if (profileErr) {
    // Rollback: delete the created auth user
    await sb.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId });
}
