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

  const online = services.filter((service) => service.ok).length;
  const allOnline = online === services.length;

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2" title={services.map((service) => `${service.label}: ${service.ok ? `${service.latencyMs}ms` : "çevrimdışı"}`).join(" · ")}>
      <span className={`h-2 w-2 rounded-full ${allOnline ? "bg-[var(--success)] shadow-[0_0_10px_var(--success)]" : "bg-[var(--warning)]"}`} />
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">{online}/{services.length} sistem aktif</span>
    </div>
  );
}
