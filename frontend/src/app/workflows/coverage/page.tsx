"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, Search, Sparkles } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import type { CoverageCheckResponse } from "@/lib/mockApi";

const TOPICS = [
  { value: "towing", label: "Çekici" },
  { value: "theft", label: "Hırsızlık" },
  { value: "fire", label: "Yangın" },
  { value: "glass", label: "Cam" },
  { value: "collision", label: "Çarpışma" },
];

interface RagResult {
  text: string;
  source: string;
  score: number;
}

export default function CoverageWorkflowPage() {
  const [policyNumber, setPolicyNumber] = useState("TR-92831");
  const [topic, setTopic] = useState(TOPICS[0].value);
  const [coverage, setCoverage] = useState<CoverageCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ragQuery, setRagQuery] = useState("İkame araç kaç gün sağlanır?");
  const [ragResults, setRagResults] = useState<RagResult[] | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  const checkCoverage = async () => {
    setLoading(true);
    setError(null);
    setCoverage(null);
    try {
      const res = await fetch("/api/workflows/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", policyNumber, topic }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setCoverage(body.coverage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Teminat sorgulanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const searchDocuments = async () => {
    setRagLoading(true);
    setRagError(null);
    setRagResults(null);
    try {
      const res = await fetch("/api/workflows/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: ragQuery }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setRagResults(body.results);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : "RAG servisine ulaşılamadı.");
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="İş Akışları"
        title="Poliçe Teminatı Sorgula"
        description="Yapılandırılmış teminat kontrolü (mock-enterprise) ve sözleşme metninde derinlemesine arama (RAG)."
      />
      <PageBody className="max-w-2xl space-y-4">
        <Link
          href="/workflows"
          className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          İş Akışlarına dön
        </Link>

        <Card>
          <CardHeader title="Yapılandırılmış Kontrol" description="check_policy_coverage tool'u — Faz 1" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Poliçe Numarası"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
            />
            <SelectField label="Teminat Konusu" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="mt-4">
            <Button onClick={checkCoverage} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Sorgula
            </Button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {coverage && (
            <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={coverage.covered ? "success" : "danger"}>
                  {coverage.covered ? "Kapsamda" : "Kapsam Dışı"}
                </Badge>
              </div>
              <p className="text-sm text-[var(--text-primary)]">{coverage.detail}</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Detaylı Arama (RAG)"
            description="Yapılandırılmış API'lerle cevaplanamayan sorular için poliçe dokümanlarında arama — Faz 6"
            action={<Sparkles className="h-4 w-4 text-[var(--accent)]" />}
          />
          <TextField
            label="Soru"
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="ör. İkame araç kaç gün sağlanır?"
          />
          <div className="mt-4">
            <Button variant="secondary" onClick={searchDocuments} disabled={ragLoading}>
              {ragLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Dokümanlarda Ara
            </Button>
          </div>

          {ragError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {ragError}
            </div>
          )}

          {ragResults && ragResults.length > 0 && (
            <ul className="mt-4 space-y-3">
              {ragResults.map((r, i) => (
                <li key={i} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <Badge tone="neutral">{r.source}</Badge>
                    <span className="text-xs text-[var(--text-muted)]">
                      benzerlik: {(r.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageBody>
    </>
  );
}
