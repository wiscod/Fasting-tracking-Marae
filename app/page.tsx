import Link from "next/link";
import { getIsoWeek } from "@/lib/week";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { Croisade } from "@/lib/types";
import { LogOut, Users, BookHeart, BarChart2, Shield } from "lucide-react";

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
    <main className="flex flex-1 flex-col px-4 py-8 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <p className="text-sm font-medium text-brand-600">Bonjour{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Mes jeûnes</h1>
        </div>
        <form action="/auth/logout" method="post">
          <button type="submit" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" aria-label="Déconnexion">
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </div>

      <div className="grid gap-4">
        <Link href="/jeune/equipe" className="group card flex flex-col gap-2 hover:border-brand-400 hover:ring-1 hover:ring-brand-400/50 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
              {teamCroisade ? `Croisade · ${teamCroisade.name}` : "Cette semaine"}
            </span>
            <Users className="h-5 w-5 text-brand-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <span className="text-xl font-bold text-slate-800 mt-1">
            {teamCroisade ? `Jeûne d'équipe — ${teamCroisade.name}` : `Jeûne d'équipe — Sem ${week.week}`}
          </span>
          <span className="text-sm text-slate-500 leading-relaxed">
            {teamCroisade?.description ?? "Saisis tes importunités et tes minutes de prière sur les sujets de la semaine."}
          </span>
        </Link>

        <Link href="/jeune/perso" className="group card flex flex-col gap-2 hover:border-brand-400 hover:ring-1 hover:ring-brand-400/50 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
              Tous mes jeûnes
            </span>
            <BookHeart className="h-5 w-5 text-brand-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <span className="text-xl font-bold text-slate-800 mt-1">Jeûnes personnels</span>
          <span className="text-sm text-slate-500 leading-relaxed">
            Liste unifiée de tes jeûnes (équipe + personnels) avec l'historique.
          </span>
        </Link>

        <Link href="/jeune/stats" className="group card flex flex-col gap-2 hover:border-brand-400 hover:ring-1 hover:ring-brand-400/50 animate-slide-up" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
              Classement
            </span>
            <BarChart2 className="h-5 w-5 text-brand-400 group-hover:text-brand-600 transition-colors" />
          </div>
          <span className="text-xl font-bold text-slate-800 mt-1">Statistiques du groupe</span>
          <span className="text-sm text-slate-500 leading-relaxed">
            Importunités, jours de jeûne et temps de prière de tous les participants.
          </span>
        </Link>

        {isDirigent && (
          <Link href="/jeune/dirigeant" className="group card flex flex-col gap-2 border-amber-200/60 bg-amber-50/30 hover:border-amber-400 hover:ring-1 hover:ring-amber-400/50 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                {dirigeantCroisade ? `Croisade dirigeants · ${dirigeantCroisade.name}` : "Dirigeants · Cette semaine"}
              </span>
              <Shield className="h-5 w-5 text-amber-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <span className="text-xl font-bold text-slate-800 mt-1">
              {dirigeantCroisade ? `Jeûne dirigeants — ${dirigeantCroisade.name}` : `Jeûne dirigeants — Sem ${week.week}`}
            </span>
            <span className="text-sm text-slate-500 leading-relaxed">
              {dirigeantCroisade?.description ?? "Enregistre tes importunités et tes jeûnes spécifiques en tant que dirigeant."}
            </span>
          </Link>
        )}
      </div>
    </main>
  );
}
