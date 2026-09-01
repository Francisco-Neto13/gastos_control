"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_LINKS, NAV_GROUPS } from "@/components/nav-links";
import { NavIcon } from "@/components/NavIcon";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha o menu mobile ao navegar.
  useEffect(() => setMenuOpen(false), [pathname]);

  const current = ALL_LINKS.find((l) => l.href === pathname);

  return (
    <div className="min-h-screen lg:flex">
      {/* Overlay do menu no mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ---------- Sidebar ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-ink-900 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-display text-sm font-bold text-white shadow-pop">
            EC
          </span>
          <span className="font-display text-sm font-bold leading-tight tracking-tight text-white">
            Espaços
            <br />
            Corporativos
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="nav-group">{group.group}</p>
              <div className="flex flex-col gap-0.5">
                {group.links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`nav-link ${active ? "nav-link-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <NavIcon name={link.icon} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[0.68rem] leading-relaxed text-slate-500">
            Protótipo de otimização de alocação de salas
          </p>
        </div>
      </aside>

      {/* ---------- Conteudo ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3 px-5 py-3.5 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menu de navegação"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            {current && (
              <div className="flex items-center gap-2 text-sm">
                <NavIcon name={current.icon} className="h-4 w-4 text-brand-600" />
                <span className="font-semibold text-ink-900">{current.label}</span>
              </div>
            )}

            <span className="ml-auto hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              ISTQB CT-AI
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-7 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
