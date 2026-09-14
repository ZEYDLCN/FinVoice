"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Radio, X } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { ServiceStatusStrip } from "./ServiceStatusStrip";

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
        <Radio className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">FinVoice Ops</div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          Voice AI Platform
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
        <Brand />
        <NavLinks pathname={pathname} />
        <div className="border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
          Faz 1-8 tamamlandı
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="flex w-64 flex-col bg-[var(--surface)] shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                aria-label="Menüyü kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:justify-end md:px-6">
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="flex items-center gap-3">
            <ServiceStatusStrip />
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] md:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 bg-[var(--bg)]">{children}</main>
      </div>
    </div>
  );
}
