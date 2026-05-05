import { Header } from "@/components/Header";
import { AdminClient } from "./client";
import { getIsoWeek } from "@/lib/week";

export default function AdminPage() {
  const w = getIsoWeek();
  return (
    <>
      <Header title="Administration" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <AdminClient initialYear={w.year} initialWeek={w.week} />
      </main>
    </>
  );
}
