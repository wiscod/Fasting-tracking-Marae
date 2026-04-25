import { Header } from "@/components/Header";
import { TeamFastClient } from "./client";
import { getIsoWeek } from "@/lib/week";

export default function TeamFastPage() {
  const w = getIsoWeek();
  return (
    <>
      <Header title={`Sem ${w.week}`} back={{ href: "/", label: "Accueil" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <TeamFastClient initialYear={w.year} initialWeek={w.week} />
      </main>
    </>
  );
}
