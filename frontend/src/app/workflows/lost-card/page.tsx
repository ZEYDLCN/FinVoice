"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Stepper } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/Badge";
import type { Card as BankCard } from "@/lib/mockApi";

const STEPS = ["Müşteri Doğrulama", "Kart Seçimi", "Sonuç"];

interface Replacement {
  newCardId: string;
  replacesCardId: string;
  status: string;
  estimatedDeliveryDays: number;
}

export default function LostCardWorkflowPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("CUST-001");
  const [cards, setCards] = useState<BankCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [replacement, setReplacement] = useState<Replacement | null>(null);

  const listCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows/lost-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-cards", customerId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      const active = (body.cards as BankCard[]).filter((c) => c.status === "ACTIVE");
      if (active.length === 0) {
        setError("Bu müşteride dondurulabilecek aktif bir kart bulunamadı.");
        return;
      }
      setCards(active);
      setSelectedCardId(active[0].cardId);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Müşteri kartları getirilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const freezeAndReplace = async () => {
    if (!selectedCardId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows/lost-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "freeze-and-replace", cardId: selectedCardId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setReplacement(body.replacement);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="İş Akışları"
        title="Kayıp Kart Bildir"
        description="Müşterinin kartlarını listeler, seçilen kartı dondurup yerine yenisini talep eder."
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
            <Stepper steps={STEPS} current={step} />
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
                label="Müşteri ID"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="CUST-001"
                hint="Bu demo ortamında kimlik doğrulama yok — müşteri ID'sini doğrudan girin."
              />
              <Button onClick={listCards} disabled={loading || !customerId.trim()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Kartları Listele
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                {cards.map((c) => (
                  <label
                    key={c.cardId}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      selectedCardId === c.cardId
                        ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="card"
                      className="accent-[var(--brand)]"
                      checked={selectedCardId === c.cardId}
                      onChange={() => setSelectedCardId(c.cardId)}
                    />
                    <CreditCard className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-primary)]">
                      •••• {c.last4} — {c.type}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  Geri
                </Button>
                <Button onClick={freezeAndReplace} disabled={loading || !selectedCardId}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Dondur ve Yeni Kart Talep Et
                </Button>
              </div>
            </div>
          )}

          {step === 2 && replacement && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-[var(--success)]" />
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Kart donduruldu, yenisi talep edildi
              </div>
              <Badge tone="success">{replacement.newCardId}</Badge>
              <p className="max-w-sm text-xs text-[var(--text-secondary)]">
                Tahmini teslimat süresi {replacement.estimatedDeliveryDays} gün.
              </p>
              <Link href="/workflows" className="mt-2">
                <Button variant="ghost">İş Akışlarına Dön</Button>
              </Link>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
