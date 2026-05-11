import { Header } from "@/components/Header";
import { StatsClient } from "./client";

export default function StatsPage() {
  return (
    <>
      <Header title="Statistiques" back={{ href: "/" }} />
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <StatsClient />
      </main>
    </>
  );
}
