import Link from "next/link";
import { getIsoWeek } from "@/lib/week";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Croisade } from "@/lib/types";

export default async function HomePage() {
  const week = getIsoWeek();
  const sb = getSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  let firstName: string | null = null;
  let isDirigent = false;
  if (auth.user) {
    const { data: profile } = await sb
      .from("profiles")
      .select("first_name, is_dirigeant")
      .eq("id", auth.user.id)
      .maybeSingle();
    firstName = profile?.first_name ?? null;
    isDirigent = profile?.is_dirigeant ?? false;
  }

  const today = new Date().toISOString().slice(0, 10);

  // Load active croisades (team + dirigeant) in parallel
  const [{ data: teamCroisadeData }, { data: dirigeantCroisadeData }] = await Promise.all([
    sb.from("croisades").select("*").eq("is_dirigeant", false).eq("is_active", true)
      .lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`).order("start_date", { ascending: false }).limit(1),
    sb.from("croisades").select("*").eq("is_dirigeant", true).eq("is_active", true)
      .lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`).order("start_date", { ascending: false }).limit(1),
  ]);

  const teamCroisade = (teamCroisadeData?.[0] ?? null) as Croisade | null;
  const dirigeantCroisade = (dirigeantCroisadeData?.[0] ?? null) as Croisade | null;

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
        <span className="text-xs uppercase tracking-wide text-brand-600">
          {teamCroisade ? `Croisade · ${teamCroisade.name}` : "Cette semaine"}
        </span>
        <span className="text-lg font-semibold">
          {teamCroisade ? `Jeûne d'équipe — ${teamCroisade.name}` : `Jeûne d'équipe — Sem ${week.week}`}
        </span>
        <span className="text-sm text-slate-500">
          {teamCroisade?.description ?? "Saisis tes importunités et tes minutes de prière sur les sujets de la semaine."}
        </span>
      </Link>

      {teamCroisade && (
        <Link href={`/jeune/croisade/${teamCroisade.id}`} className="card flex flex-col gap-1 hover:border-brand-500">
          <span className="text-xs uppercase tracking-wide text-brand-600">Mes jeûnes · {teamCroisade.name}</span>
          <span className="text-lg font-semibold">Voir mes jeûnes de la croisade</span>
          <span className="text-sm text-slate-500">Consulte tes jeûnes effectués pendant cette croisade.</span>
        </Link>
      )}

      <Link href="/jeune/perso" className="card flex flex-col gap-1 hover:border-brand-500">
        <span className="text-xs uppercase tracking-wide text-brand-600">Tous mes jeûnes</span>
        <span className="text-lg font-semibold">Mes jeûnes</span>
        <span className="text-sm text-slate-500">
          Liste unifiée de tes jeûnes (équipe + personnels).
        </span>
      </Link>

      {isDirigent && (
        <>
          <Link href="/jeune/dirigeant" className="card flex flex-col gap-1 hover:border-amber-500 border-amber-200">
            <span className="text-xs uppercase tracking-wide text-amber-600">
              {dirigeantCroisade ? `Croisade dirigeants · ${dirigeantCroisade.name}` : "Dirigeants · Cette semaine"}
            </span>
            <span className="text-lg font-semibold">
              {dirigeantCroisade ? `Jeûne des dirigeants — ${dirigeantCroisade.name}` : `Jeûne des dirigeants — Sem ${week.week}`}
            </span>
            <span className="text-sm text-slate-500">
              {dirigeantCroisade?.description ?? "Enregistre tes importunités et tes jeûnes en tant que dirigeant."}
            </span>
          </Link>
          {dirigeantCroisade && (
            <Link href={`/jeune/croisade/${dirigeantCroisade.id}`} className="card flex flex-col gap-1 hover:border-amber-500 border-amber-200">
              <span className="text-xs uppercase tracking-wide text-amber-600">Mes jeûnes · {dirigeantCroisade.name}</span>
              <span className="text-lg font-semibold">Voir mes jeûnes de la croisade</span>
              <span className="text-sm text-slate-500">Consulte tes jeûnes effectués pendant cette croisade.</span>
            </Link>
          )}
        </>
      )}
    </main>
  );
}
