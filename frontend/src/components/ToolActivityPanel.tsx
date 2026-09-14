"use client";

import { Activity, Check, X } from "lucide-react";
import type { HandoffContext, Intent, ToolCallLogEntry } from "@/lib/types";

const INTENT_LABELS: Record<NonNullable<Intent>, string> = {
  create_claim: "Hasar Dosyası Oluşturma",
  claim_status: "Hasar Durumu Sorgulama",
  policy_coverage: "Poliçe Teminat Kontrolü",
  lost_card: "Kayıp Kart Bildirimi",
  human_handoff: "Müşteri Temsilcisine Aktarım",
};

export function ToolActivityPanel({
  intent,
  confidence,
  toolCalls,
  handoff,
}: {
  intent: Intent;
  confidence: number | null;
  toolCalls: ToolCallLogEntry[];
  handoff: HandoffContext | null;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <Activity className="h-4 w-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Tool Activity</h2>
      </div>

      <div className="finvoice-scroll space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Intent
          </div>
          <div className="text-sm text-[var(--text-primary)]">
            {intent ? INTENT_LABELS[intent] : "—"}
          </div>
          {confidence !== null && (
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              confidence: {(confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Tools
          </div>
          {toolCalls.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">Henüz bir tool çağrısı yok.</p>
          )}
          <ul className="space-y-2">
            {toolCalls.map((tc) => (
              <li
                key={tc.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
                    {tc.status === "success" ? (
                      <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-[var(--danger)]" />
                    )}
                    {tc.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{tc.durationMs} ms</span>
                </div>
                {tc.error && <div className="mt-1 text-xs text-[var(--danger)]">{tc.error}</div>}
              </li>
            ))}
          </ul>
        </div>

        {handoff && (
          <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--warning)]">
              Human Handoff Context
            </div>
            <pre className="finvoice-scroll mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[var(--text-primary)]">
              {handoff.summary}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
