import Link from "next/link";
import { getIsoWeek } from "@/lib/week";

export default function HomePage() {
  const week = getIsoWeek();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm text-slate-500">Bienvenue</p>
        <h1 className="text-2xl font-bold">Mes jeûnes</h1>
      </div>

      <Link href="/jeune/equipe" className="card flex flex-col gap-1 hover:border-brand-500">
        <span className="text-xs uppercase tracking-wide text-brand-600">
          Cette semaine
        </span>
        <span className="text-lg font-semibold">Jeûne d'équipe — Sem {week.week}</span>
        <span className="text-sm text-slate-500">
          Saisis tes importunités et tes minutes de prière sur les sujets de la semaine.
        </span>
      </Link>

      <Link href="/jeune/perso" className="card flex flex-col gap-1 hover:border-brand-500">
        <span className="text-xs uppercase tracking-wide text-brand-600">Personnel</span>
        <span className="text-lg font-semibold">Mes jeûnes personnels</span>
        <span className="text-sm text-slate-500">
          Crée et suis tes propres jeûnes, en équipe ou non.
        </span>
      </Link>
    </main>
  );
}
