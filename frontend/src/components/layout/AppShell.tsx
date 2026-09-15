"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, Menu, Sparkles, X } from "lucide-react";
import { FinVoiceLogo } from "@/components/brand/FinVoiceLogo";
import { NAV_ITEMS } from "./nav";
import { ServiceStatusStrip } from "./ServiceStatusStrip";

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1.5 px-3">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-[var(--brand)] text-[var(--brand-ink)] shadow-[0_10px_30px_rgba(130,243,170,.12)]"
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
    <div className="flex items-center gap-3 px-4 py-5">
      <FinVoiceLogo className="h-10 w-10 shrink-0 drop-shadow-[0_8px_20px_rgba(66,223,224,.2)]" />
      <div>
        <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">FinVoice</div>
        <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-[var(--brand)]">
          AI Operations
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen gap-3 p-2 md:p-3">
      <aside className="glass-panel sticky top-3 hidden h-[calc(100vh-1.5rem)] w-64 shrink-0 flex-col rounded-[26px] md:flex">
        <Brand />
        <div className="px-6 pb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">Çalışma alanı</div>
        <NavLinks pathname={pathname} />
        <div className="m-3 rounded-2xl border border-[var(--border)] bg-[var(--brand-soft)] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)]">
            <Sparkles className="h-3.5 w-3.5" />
            Qwen3 hazır
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--text-secondary)]">Yerel ve güvenli AI iş akışları aktif.</p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="flex w-72 flex-col rounded-r-[28px] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
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
        <header className="glass-panel flex min-h-16 items-center justify-between rounded-[22px] px-4 py-2.5 md:px-5">
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="hidden md:block">
            <div className="text-xs text-[var(--text-muted)]">FinVoice çalışma alanı</div>
            <div className="text-sm font-medium text-[var(--text-primary)]">İyi çalışmalar</div>
          </div>
          <div className="flex items-center gap-2.5">
            <ServiceStatusStrip />
            <button className="hidden h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] transition hover:text-[var(--brand)] sm:flex" aria-label="Bildirimler">
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--accent)] text-xs font-bold text-[var(--brand-ink)] sm:flex">FV</div>
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] md:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
