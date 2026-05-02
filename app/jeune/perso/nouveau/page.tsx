import { Header } from "@/components/Header";
import { PersonalEditor } from "../editor";

export default function NewPersonalFastPage() {
  return (
    <>
      <Header title="Nouveau jeûne" back={{ href: "/jeune/perso", label: "Retour" }} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <PersonalEditor mode="create" />
      </main>
    </>
  );
}
