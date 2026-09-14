"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Mic,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import type { ServiceStatus } from "@/app/api/status/route";

interface MetricsSummary {
  business: {
    chatTurns: number;
    activeSessions: number;
    automationRatePct: number | null;
    handoffRatePct: number | null;
  } | null;
}

const PHASES = [
  "Mock Enterprise API",
  "Voice Console",
  "VAD + STT",
  "Agent Orchestrator",
  "Text-to-Speech",
  "RAG",
  "Human Handoff",
  "Observability",
];

const NAV_CARDS = [
  {
    href: "/console",
    icon: Mic,
    title: "Voice Console",
    description: "Serbest metinle (yakında sesle) doğal dilde işlem yapın.",
  },
  {
    href: "/workflows",
    icon: Workflow,
    title: "İş Akışları",
    description: "Hasar açma, teminat sorgulama gibi adım adım rehberli akışlar.",
  },
  {
    href: "/dashboard",
    icon: SlidersHorizontal,
    title: "Dashboard",
    description: "Canlı Prometheus metrikleri: automation rate, handoff rate, latency.",
  },
];

export default function OverviewPage() {
  const [services, setServices] = useState<ServiceStatus[] | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/status").then((r) => r.json()),
      fetch("/api/metrics/summary").then((r) => r.json()),
    ]).then(([statusData, metricsData]) => {
      if (cancelled) return;
      setServices(statusData.services);
      setMetrics(metricsData);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const upCount = services?.filter((s) => s.ok).length ?? 0;

  return (
    <>
      <PageHeader
        breadcrumb="FinVoice Ops"
        title="Genel Bakış"
        description="Bankacılık ve sigorta operasyonları için gerçek zamanlı Voice AI automation platformu."
      />
      <PageBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Servis Durumu"
            value={services ? `${upCount}/${services.length}` : "…"}
            hint="Ayarlar'dan servis adreslerini değiştirebilirsiniz"
            tone={services && upCount === services.length ? "success" : "warning"}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatTile
            label="Toplam Chat Turu"
            value={metrics?.business ? metrics.business.chatTurns : "—"}
            hint={metrics?.business ? undefined : "backend/ servisi çalışmıyor"}
            tone="brand"
            icon={<FileText className="h-4 w-4" />}
          />
          <StatTile
            label="Automation Rate"
            value={
              metrics?.business?.automationRatePct !== null &&
              metrics?.business?.automationRatePct !== undefined
                ? `%${metrics.business.automationRatePct}`
                : "—"
            }
            tone="success"
            icon={<Workflow className="h-4 w-4" />}
          />
          <StatTile
            label="Aktif Session"
            value={metrics?.business ? metrics.business.activeSessions : "—"}
            tone="neutral"
            icon={<Mic className="h-4 w-4" />}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {NAV_CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-[var(--shadow-md)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                  <c.icon className="h-4 w-4" />
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                  {c.title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{c.description}</p>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader
            title="Proje Yol Haritası"
            description="ROADMAP.md — spesifikasyondaki 8 fazın tamamı bağımsız olarak çalışır ve test edilmiştir."
          />
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p, i) => (
              <Badge key={p} tone="success" dot>
                Faz {i + 1} — {p}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Servisler" description="Her servisin canlı sağlık durumu" />
          {!services ? (
            <p className="text-sm text-[var(--text-muted)]">Yükleniyor…</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        s.ok ? "bg-[var(--success)]" : "bg-[var(--danger)]"
                      }`}
                    />
                    <span className="text-sm text-[var(--text-primary)]">{s.label}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {s.ok ? `${s.latencyMs}ms` : "erişilemiyor"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
