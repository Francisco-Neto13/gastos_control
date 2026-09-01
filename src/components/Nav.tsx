"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/rooms", label: "Salas" },
  { href: "/sectors", label: "Setores e Equipes" },
  { href: "/allocate", label: "Gerar Alocação" },
  { href: "/compare", label: "Comparação" },
  { href: "/exceptions", label: "Exceções" },
  { href: "/governance", label: "Governança" },
  { href: "/monitoring", label: "Monitoramento" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <span className="text-sm font-bold tracking-tight text-brand-700">
          Espaços Corporativos
        </span>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
