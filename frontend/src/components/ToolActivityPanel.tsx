"use client";

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
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Tool Activity</h2>
      </div>

      <div className="space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Intent</div>
          <div className="text-sm text-slate-200">
            {intent ? INTENT_LABELS[intent] : "—"}
          </div>
          {confidence !== null && (
            <div className="mt-1 text-xs text-slate-500">
              confidence: {(confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">Tools</div>
          {toolCalls.length === 0 && (
            <p className="text-xs text-slate-600">Henüz bir tool çağrısı yok.</p>
          )}
          <ul className="space-y-2">
            {toolCalls.map((tc) => (
              <li
                key={tc.id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-slate-200">
                    <span className={tc.status === "success" ? "text-emerald-400" : "text-red-400"}>
                      {tc.status === "success" ? "✓" : "✕"}
                    </span>
                    {tc.name}
                  </span>
                  <span className="text-xs text-slate-500">{tc.durationMs} ms</span>
                </div>
                {tc.error && <div className="mt-1 text-xs text-red-400">{tc.error}</div>}
              </li>
            ))}
          </ul>
        </div>

        {handoff && (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-3">
            <div className="text-[10px] uppercase tracking-wide text-amber-500">
              Human Handoff Context
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-amber-200">
              {handoff.summary}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
