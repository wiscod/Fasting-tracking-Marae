import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function Header({
  title,
  back,
}: {
  title: string;
  back?: { href: string; label?: string };
}) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/50 bg-white/60 px-4 py-3.5 backdrop-blur-xl transition-all shadow-sm">
      <div className="flex w-1/4 items-center justify-start">
        {back ? (
          <Link
            href={back.href}
            className="group flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-brand-600"
          >
            <ChevronLeft className="mr-1 h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">{back.label ?? "Retour"}</span>
          </Link>
        ) : (
          <Image src="/logo.svg" alt="Logo" width={32} height={32} priority className="rounded-xl shadow-sm" />
        )}
      </div>
      
      <h1 className="flex-1 text-center text-[17px] font-bold text-slate-800 tracking-tight">{title}</h1>
      
      <div className="flex w-1/4 items-center justify-end">
        {/* Placeholder for trailing icons like settings or profile */}
      </div>
    </header>
  );
}
