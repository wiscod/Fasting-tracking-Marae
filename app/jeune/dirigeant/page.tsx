import { Header } from "@/components/Header";
import { DirigentFastClient } from "./client";

export default function DirigentFastPage() {
  return (
    <>
      <Header title="Jeûne des dirigeants" back={{ href: "/", label: "Accueil" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <DirigentFastClient />
      </main>
    </>
  );
}
