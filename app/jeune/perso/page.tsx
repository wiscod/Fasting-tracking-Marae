import { Header } from "@/components/Header";
import { PersonalListClient } from "./client";

export default function PersonalListPage() {
  return (
    <>
      <Header title="Jeûnes personnels" back={{ href: "/", label: "Accueil" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <PersonalListClient />
      </main>
    </>
  );
}
