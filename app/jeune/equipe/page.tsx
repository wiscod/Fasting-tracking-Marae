import { Suspense } from "react";
import { Header } from "@/components/Header";
import { TeamFastClient } from "./client";
import { getIsoWeek } from "@/lib/week";

export default function TeamFastPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; week?: string }>;
}) {
  const w = getIsoWeek();

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <TeamFastPageContent
        initialYear={w.year}
        initialWeek={w.week}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function TeamFastPageContent({
  initialYear,
  initialWeek,
  searchParams,
}: {
  initialYear: number;
  initialWeek: number;
  searchParams: Promise<{ year?: string; week?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : initialYear;
  const week = params.week ? Number(params.week) : initialWeek;

  return (
    <>
      <Header title={`Sem ${week}`} back={{ href: "/", label: "Accueil" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <TeamFastClient initialYear={year} initialWeek={week} />
      </main>
    </>
  );
}
