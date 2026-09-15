"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, MessageCircleMore, ShieldCheck, Sparkles, Volume2, Workflow } from "lucide-react";
import { FinVoiceLogo } from "@/components/brand/FinVoiceLogo";
import { PageBody } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
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

const FEATURES = [
  { href: "/console", icon: MessageCircleMore, title: "AI ile konuş", text: "Poliçe, hasar ve kart işlemlerini doğal dille başlat.", tone: "bg-[var(--brand)] text-[var(--brand-ink)]" },
  { href: "/workflows", icon: Workflow, title: "Akışları yönet", text: "Kritik işlemleri adım adım ve güvenle tamamla.", tone: "bg-[#c9ff75] text-[#0a130d]" },
  { href: "/dashboard", icon: Sparkles, title: "Canlı içgörüler", text: "Otomasyon, gecikme ve araç performansını izle.", tone: "bg-[#dce4ff] text-[#111827]" },
];

export default function OverviewPage() {
  const [services, setServices] = useState<ServiceStatus[] | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/status").then((r) => r.json()), fetch("/api/metrics/summary").then((r) => r.json())])
      .then(([statusData, metricsData]) => {
        if (!cancelled) { setServices(statusData.services); setMetrics(metricsData); }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const upCount = services?.filter((service) => service.ok).length ?? 0;

  return (
    <PageBody className="space-y-5 pt-5">
      <section className="ambient-card glass-panel grid min-h-[390px] gap-8 rounded-[32px] p-7 md:grid-cols-[1.1fr_.9fr] md:p-11">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-hover)] px-3 py-1.5 text-[11px] font-medium text-[var(--brand)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_12px_var(--brand)]" />
            Voice AI operasyon merkezi
          </div>
          <h1 className="max-w-2xl text-4xl font-medium leading-[1.03] tracking-[-0.06em] text-[var(--text-primary)] md:text-6xl">
            Finans operasyonları <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--accent)] bg-clip-text text-transparent">artık konuşuyor.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
            Müşteri taleplerini anlayan, doğru aracı seçen ve sonucu doğal Türkçe sesle sunan güvenli AI çalışma alanı.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/console" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-[var(--brand-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-hover)]">
              Konuşmayı başlat <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/workflows" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-hover)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--brand)]">
              İş akışlarını keşfet
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[280px] items-center justify-center">
          <div className="absolute h-64 w-64 rounded-full border border-[var(--border)]" />
          <div className="voice-pulse absolute h-52 w-52 rounded-full border border-[var(--brand)]/20 bg-[var(--brand-soft)] blur-[1px]" />
          <div className="absolute h-36 w-36 rounded-full bg-[var(--accent)]/10 blur-2xl" />
          <FinVoiceLogo className="relative h-28 w-28 drop-shadow-[0_24px_50px_rgba(66,223,224,.28)]" />
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[#0c120f]/90 px-4 py-2 shadow-xl backdrop-blur-xl">
            {[8, 15, 24, 13, 30, 19, 10].map((height, index) => <span key={index} className="w-1 rounded-full bg-[var(--brand)]" style={{ height }} />)}
            <span className="ml-2 whitespace-nowrap text-[10px] font-medium text-[var(--text-secondary)]">Dinlemeye hazır</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Servisler" value={services ? `${upCount}/${services.length}` : "…"} tone={services && upCount === services.length ? "success" : "warning"} icon={<Check className="h-4 w-4" />} />
        <StatTile label="Konuşma turu" value={metrics?.business?.chatTurns ?? "—"} tone="brand" icon={<Volume2 className="h-4 w-4" />} />
        <StatTile label="Otomasyon" value={metrics?.business?.automationRatePct != null ? `%${metrics.business.automationRatePct}` : "—"} tone="success" icon={<Sparkles className="h-4 w-4" />} />
        <StatTile label="Aktif oturum" value={metrics?.business?.activeSessions ?? "—"} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <Link key={feature.href} href={feature.href} className={`${feature.tone} group ambient-card min-h-44 rounded-[24px] p-5 shadow-[var(--shadow-md)] transition duration-300 hover:-translate-y-1`}>
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10"><feature.icon className="h-5 w-5" /></div>
              <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-8 text-xl font-semibold tracking-[-0.035em]">{feature.title}</div>
            <p className="mt-2 max-w-xs text-xs leading-5 opacity-70">{feature.text}</p>
            {index === 0 && <div className="absolute right-3 top-16 h-24 w-24 rounded-full border border-black/10" />}
          </Link>
        ))}
      </div>

      <Card className="ambient-card">
        <CardHeader title="Sistem durumu" description="FinVoice servislerinin canlı bağlantı ve yanıt süreleri" action={<span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--success)]">CANLI</span>} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(services ?? []).map((service) => (
            <div key={service.key} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-3.5 py-3">
              <div className="flex items-center gap-2.5"><span className={`h-2 w-2 rounded-full ${service.ok ? "bg-[var(--success)] shadow-[0_0_10px_var(--success)]" : "bg-[var(--danger)]"}`} /><span className="text-xs font-medium text-[var(--text-primary)]">{service.label}</span></div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">{service.ok ? `${service.latencyMs}ms` : "offline"}</span>
            </div>
          ))}
        </div>
      </Card>
    </PageBody>
  );
}
