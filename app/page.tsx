import Link from "next/link";
import { getIsoWeek } from "@/lib/week";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default async function HomePage() {
  const week = getIsoWeek();
  const sb = getSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  let firstName: string | null = null;
  if (auth.user) {
    const { data: profile } = await sb
      .from("profiles")
      .select("first_name")
      .eq("id", auth.user.id)
      .maybeSingle();
    firstName = profile?.first_name ?? null;
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">Bonjour{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="text-2xl font-bold">Mes jeûnes</h1>
        </div>
        <form action="/auth/logout" method="post">
          <button type="submit" className="text-xs text-slate-500 hover:text-slate-700">Déconnexion</button>
        </form>
      </div>

      <Link href="/jeune/equipe" className="card flex flex-col gap-1 hover:border-brand-500">
        <span className="text-xs uppercase tracking-wide text-brand-600">Cette semaine</span>
        <span className="text-lg font-semibold">Jeûne d'équipe — Sem {week.week}</span>
        <span className="text-sm text-slate-500">
          Saisis tes importunités et tes minutes de prière sur les sujets de la semaine.
        </span>
      </Link>

      <Link href="/jeune/perso" className="card flex flex-col gap-1 hover:border-brand-500">
        <span className="text-xs uppercase tracking-wide text-brand-600">Tous mes jeûnes</span>
        <span className="text-lg font-semibold">Mes jeûnes</span>
        <span className="text-sm text-slate-500">
          Liste unifiée de tes jeûnes (équipe + personnels).
        </span>
      </Link>
    </main>
  );
}
