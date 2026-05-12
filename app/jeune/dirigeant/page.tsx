import { Suspense } from "react";
import { Header } from "@/components/Header";
import { DirigentFastClient } from "./client";
import { getIsoWeek } from "@/lib/week";

export default function DirigentFastPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; week?: string }>;
}) {
  const w = getIsoWeek();

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <DirigentFastPageContent
        initialYear={w.year}
        initialWeek={w.week}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function DirigentFastPageContent({
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
      <Header title="Jeûne des dirigeants" back={{ href: "/", label: "Accueil" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <DirigentFastClient initialYear={year} initialWeek={week} />
      </main>
    </>
  );
}