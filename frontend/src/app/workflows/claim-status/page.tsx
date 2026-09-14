"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, Search } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { Claim } from "@/lib/mockApi";

const STATUS_LABELS: Record<Claim["status"], { label: string; tone: BadgeTone }> = {
  OPEN: { label: "Açık — değerlendirme aşamasında", tone: "info" },
  EXPERT_REVIEW: { label: "Eksper incelemesinde", tone: "warning" },
  APPROVED: { label: "Onaylandı", tone: "success" },
  REJECTED: { label: "Reddedildi", tone: "danger" },
  CLOSED: { label: "Kapatıldı", tone: "neutral" },
};

export default function ClaimStatusWorkflowPage() {
  const [claimId, setClaimId] = useState("CLM-98221");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    setClaim(null);
    try {
      const res = await fetch("/api/workflows/claim-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setClaim(body.claim);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hasar dosyası bulunamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="İş Akışları"
        title="Hasar Durumu Sorgula"
        description="Dosya numarasıyla bir hasar kaydının güncel durumunu görüntüler."
      />
      <PageBody className="max-w-2xl">
        <Link
          href="/workflows"
          className="mb-4 inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          İş Akışlarına dön
        </Link>

        <Card>
          <div className="flex gap-2">
            <div className="flex-1">
              <TextField
                label="Hasar Dosya Numarası"
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
                placeholder="CLM-98221"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={search} disabled={loading || !claimId.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Sorgula
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {claim && (
            <div className="mt-5 rounded-lg border border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {claim.claimId}
                </span>
                <Badge tone={STATUS_LABELS[claim.status].tone}>
                  {STATUS_LABELS[claim.status].label}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-[var(--text-secondary)]">Poliçe</dt>
                <dd className="text-[var(--text-primary)]">{claim.policyNumber}</dd>
                <dt className="text-[var(--text-secondary)]">Kaza Tarihi</dt>
                <dd className="text-[var(--text-primary)]">{claim.accidentDate}</dd>
                <dt className="text-[var(--text-secondary)]">Konum</dt>
                <dd className="text-[var(--text-primary)]">{claim.location}</dd>
                <dt className="text-[var(--text-secondary)]">Açıklama</dt>
                <dd className="text-[var(--text-primary)]">{claim.description}</dd>
              </dl>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
