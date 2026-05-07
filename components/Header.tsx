import Image from "next/image";
import Link from "next/link";

export function Header({
  title,
  back,
}: {
  title: string;
  back?: { href: string; label?: string };
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
      {back ? (
        <Link
          href={back.href}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← {back.label ?? "Retour"}
        </Link>
      ) : (
        <Image src="/logo.svg" alt="" width={28} height={28} priority />
      )}
      <h1 className="ml-auto mr-auto text-base font-semibold">{title}</h1>
      {back ? <span className="w-12" /> : <span className="w-7" />}
    </header>
  );
}
