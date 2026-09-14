"use client";

import { useEffect, useRef } from "react";
import { MessageSquareText } from "lucide-react";
import type { TranscriptMessage } from "@/lib/types";

export function TranscriptPanel({ messages }: { messages: TranscriptMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <MessageSquareText className="h-4 w-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Gerçek Zamanlı Transcript
        </h2>
      </div>
      <div className="finvoice-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">
            Henüz bir konuşma yok. Aşağıdan bir mesaj gönderin — örn. &quot;Arabamla kaza
            yaptım, hasar dosyası açtırmak istiyorum.&quot;
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "customer" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "customer"
                  ? "bg-[var(--brand)] text-white"
                  : m.role === "ai"
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    : "bg-[var(--warning-soft)] text-[var(--warning)]"
              }`}
            >
              {m.text}
            </span>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {m.role === "customer" ? "Müşteri" : m.role === "ai" ? "FinVoice AI" : "Sistem"}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
