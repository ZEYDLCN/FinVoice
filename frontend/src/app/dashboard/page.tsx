"use client";

import { useEffect, useState } from "react";
import { Activity, Clock, GitBranch, ShieldAlert, Users, Wrench } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface Summary {
  available: { backend: boolean; voice: boolean; rag: boolean; mockEnterprise: boolean };
  business: {
    chatTurns: number;
    activeSessions: number;
    handoffTotal: number;
    handoffByTrigger: Record<string, number>;
    automationRatePct: number | null;
    handoffRatePct: number | null;
    avgLatencyMs: number | null;
  } | null;
  tools: Array<{ tool: string; success: number; error: number; avgDurationMs: number | null }>;
  voice: {
    vadAvgMs: number | null;
    sttAvgMs: number | null;
    ttsAvgMs: number | null;
    transcriptionsTotal: number;
  } | null;
  httpTotals: Record<string, number | null>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/metrics/summary")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) {
            setSummary(data);
            setLoading(false);
          }
        })
        .catch(() => !cancelled && setLoading(false));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const anyAvailable = summary && Object.values(summary.available).some(Boolean);

  return (
    <>
      <PageHeader
        breadcrumb="Faz 8"
        title="Dashboard"
        description="Her servisin /metrics uç noktasından canlı okunan Prometheus verileri — 10 saniyede bir yenilenir."
        action={<Badge tone="brand">Canlı</Badge>}
      />
      <PageBody>
        {loading && !summary ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
            ))}
          </div>
        ) : !anyAvailable ? (
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title="Hiçbir servise ulaşılamıyor"
            description="backend/, voice/ ve rag/ servislerini başlatın (bkz. kök README.md) ya da Ayarlar sayfasından adreslerini kontrol edin."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Toplam Chat Turu"
                value={summary?.business?.chatTurns ?? "—"}
                icon={<GitBranch className="h-4 w-4" />}
                tone="brand"
              />
              <StatTile
                label="Automation Rate"
                value={
                  summary?.business?.automationRatePct !== null &&
                  summary?.business?.automationRatePct !== undefined
                    ? `%${summary.business.automationRatePct}`
                    : "—"
                }
                icon={<Activity className="h-4 w-4" />}
                tone="success"
              />
              <StatTile
                label="Human Handoff Rate"
                value={
                  summary?.business?.handoffRatePct !== null &&
                  summary?.business?.handoffRatePct !== undefined
                    ? `%${summary.business.handoffRatePct}`
                    : "—"
                }
                icon={<ShieldAlert className="h-4 w-4" />}
                tone="warning"
              />
              <StatTile
                label="Aktif Session"
                value={summary?.business?.activeSessions ?? "—"}
                icon={<Users className="h-4 w-4" />}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Chat Turn Latency"
                  description="finvoice_chat_latency_seconds — ortalama"
                />
                {summary?.business?.avgLatencyMs !== null && summary?.business?.avgLatencyMs !== undefined ? (
                  <div className="flex items-center gap-2 text-2xl font-semibold text-[var(--text-primary)]">
                    <Clock className="h-5 w-5 text-[var(--text-muted)]" />
                    {summary.business.avgLatencyMs} ms
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">backend/ servisi çalışmıyor.</p>
                )}
              </Card>

              <Card>
                <CardHeader title="Voice Pipeline Latency" description="VAD / STT / TTS ortalaması" />
                {summary?.voice ? (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-semibold text-[var(--text-primary)]">
                        {summary.voice.vadAvgMs ?? "—"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">VAD ms</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[var(--text-primary)]">
                        {summary.voice.sttAvgMs ?? "—"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">STT ms</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[var(--text-primary)]">
                        {summary.voice.ttsAvgMs ?? "—"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">TTS ms</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">voice/ servisi çalışmıyor.</p>
                )}
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader
                title="Tool Call İstatistikleri"
                description="finvoice_tool_calls_total / finvoice_tool_call_duration_seconds"
                action={<Wrench className="h-4 w-4 text-[var(--text-muted)]" />}
              />
              {summary && summary.tools.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-[var(--text-muted)]">
                        <th className="pb-2 font-medium">Tool</th>
                        <th className="pb-2 font-medium">Başarılı</th>
                        <th className="pb-2 font-medium">Hatalı</th>
                        <th className="pb-2 font-medium">Ort. Süre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.tools.map((t) => (
                        <tr key={t.tool} className="border-t border-[var(--border)]">
                          <td className="py-2 text-[var(--text-primary)]">{t.tool}</td>
                          <td className="py-2 text-[var(--success)]">{t.success}</td>
                          <td className="py-2 text-[var(--danger)]">{t.error}</td>
                          <td className="py-2 text-[var(--text-secondary)]">
                            {t.avgDurationMs !== null ? `${t.avgDurationMs} ms` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Henüz tool çağrısı yok — backend&apos;in gerçek agent&apos;ı (Ollama) ile bir sohbet
                  gerçekleştiğinde burada görünecek.
                </p>
              )}
            </Card>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(summary?.httpTotals ?? {}).map(([service, total]) => (
                <StatTile
                  key={service}
                  label={`${service} — toplam istek`}
                  value={total ?? "—"}
                  tone="neutral"
                />
              ))}
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
