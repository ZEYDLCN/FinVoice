"use client";

import { useEffect, useState } from "react";
import type { ServiceStatus } from "@/app/api/status/route";

export function ServiceStatusStrip() {
  const [services, setServices] = useState<ServiceStatus[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        if (!cancelled) setServices(data.services);
      } catch {
        if (!cancelled) setServices(null);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!services) {
    return <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface-hover)]" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {services.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5" title={s.error ?? `${s.url}`}>
          <span
            className={`h-2 w-2 rounded-full ${
              s.ok ? "bg-[var(--success)]" : "bg-[var(--danger)]"
            }`}
          />
          <span className="hidden text-xs text-[var(--text-secondary)] sm:inline">{s.label}</span>
          {s.ok && s.latencyMs !== null && (
            <span className="hidden text-xs text-[var(--text-muted)] sm:inline">{s.latencyMs}ms</span>
          )}
        </div>
      ))}
    </div>
  );
}
