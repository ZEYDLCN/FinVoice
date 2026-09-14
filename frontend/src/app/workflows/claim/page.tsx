"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Stepper } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/Badge";
import type { Claim, Policy } from "@/lib/mockApi";

const STEPS = ["Poliçe Doğrulama", "Kaza Bilgileri", "Onay"];

async function callWorkflow<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/workflows/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export default function ClaimWorkflowPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [policyNumber, setPolicyNumber] = useState("TR-92831");
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [accidentDate, setAccidentDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);

  const checkPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const { policy } = await callWorkflow<{ policy: Policy }>("check-policy", { policyNumber });
      if (policy.status !== "ACTIVE") {
        setError(
          `Poliçe durumu "${policy.status}" — hasar kaydı yalnızca aktif poliçeler için açılabilir. Bu durumda gerçek sistemde bir müşteri temsilcisine yönlendirilirsiniz.`
        );
        setPolicy(policy);
        return;
      }
      setPolicy(policy);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Poliçe sorgulanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const { claim } = await callWorkflow<{ claim: Claim }>("submit", {
        policyNumber,
        accidentDate,
        location,
        description,
      });
      setClaim(claim);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hasar kaydı oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="İş Akışları"
        title="Hasar Dosyası Aç"
        description="Poliçe numarasını doğrulayıp kaza bilgilerini toplayarak yeni bir hasar kaydı oluşturur."
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
          <div className="mb-5">
            <Stepper steps={STEPS} current={step > 2 ? 2 : step} />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <TextField
                label="Poliçe Numarası"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="TR-92831"
                hint="Demo veride TR-92831 (ACTIVE) ve TR-10442 (EXPIRED) mevcuttur."
              />
              <Button onClick={checkPolicy} disabled={loading || !policyNumber.trim()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Poliçeyi Doğrula
              </Button>
            </div>
          )}

          {step === 1 && policy && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] px-3 py-2.5 text-sm text-[var(--success)]">
                Poliçe aktif — {policy.customer}, {policy.vehicle} ({policy.coverage})
              </div>
              <TextField
                label="Kaza Tarihi"
                type="date"
                value={accidentDate}
                onChange={(e) => setAccidentDate(e.target.value)}
              />
              <TextField
                label="Konum"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="İstanbul"
              />
              <TextAreaField
                label="Açıklama"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kazanın kısa açıklaması"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  Geri
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!accidentDate || !location.trim() || !description.trim()}
                >
                  Devam Et
                </Button>
              </div>
            </div>
          )}

          {step === 2 && policy && (
            <div className="space-y-4">
              <CardHeader title="Özet" description="Göndermeden önce kontrol edin" />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-[var(--text-secondary)]">Poliçe</dt>
                <dd className="text-[var(--text-primary)]">{policyNumber}</dd>
                <dt className="text-[var(--text-secondary)]">Müşteri</dt>
                <dd className="text-[var(--text-primary)]">{policy.customer}</dd>
                <dt className="text-[var(--text-secondary)]">Kaza Tarihi</dt>
                <dd className="text-[var(--text-primary)]">{accidentDate}</dd>
                <dt className="text-[var(--text-secondary)]">Konum</dt>
                <dd className="text-[var(--text-primary)]">{location}</dd>
                <dt className="text-[var(--text-secondary)]">Açıklama</dt>
                <dd className="text-[var(--text-primary)]">{description}</dd>
              </dl>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Geri
                </Button>
                <Button onClick={submitClaim} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Hasar Dosyası Oluştur
                </Button>
              </div>
            </div>
          )}

          {step === 3 && claim && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Hasar kaydınız oluşturuldu
              </div>
              <Badge tone="success">{claim.claimId}</Badge>
              <p className="max-w-sm text-xs text-[var(--text-secondary)]">
                Durumu &quot;Hasar Durumu Sorgula&quot; iş akışından takip edebilirsiniz.
              </p>
              <div className="mt-2 flex gap-2">
                <Link href="/workflows/claim-status">
                  <Button variant="secondary">Durumu Sorgula</Button>
                </Link>
                <Link href="/workflows">
                  <Button variant="ghost">İş Akışlarına Dön</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
