"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, MessageSquareText, Volume2 } from "lucide-react";
import type { TranscriptMessage } from "@/lib/types";

export function TranscriptPanel({
  messages,
  onSpeak,
  speakingMessageId,
  voiceLoading,
}: {
  messages: TranscriptMessage[];
  onSpeak: (message: TranscriptMessage) => void;
  speakingMessageId: string | null;
  voiceLoading: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden rounded-[24px]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <MessageSquareText className="h-4 w-4 text-[var(--brand)]" />
          Konuşma
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Canlı</span>
      </div>
      <div className="finvoice-scroll flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-5">
        {messages.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]"><MessageSquareText className="h-5 w-5" /></div><p className="text-sm font-medium text-[var(--text-primary)]">Yeni bir konuşma başlatın</p><p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-muted)]">FinVoice poliçe, hasar ve kart işlemlerinde size yardımcı olabilir.</p></div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "customer" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[88%] rounded-[18px] px-4 py-2.5 text-sm leading-6 shadow-sm ${
                m.role === "customer"
                  ? "rounded-br-md bg-[var(--brand)] text-[var(--brand-ink)]"
                  : m.role === "ai"
                    ? "rounded-bl-md border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    : "bg-[var(--warning-soft)] text-[var(--warning)]"
              }`}
            >
              {m.text}
            </span>
            <div className="mt-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {m.role === "customer" ? "Müşteri" : m.role === "ai" ? "FinVoice AI" : "Sistem"}
            </div>
            {m.role === "ai" && (
              <button
                type="button"
                onClick={() => onSpeak(m)}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand-soft)]"
                title="Yanıtı sesli dinle"
                aria-label="Yanıtı sesli dinle"
              >
                {speakingMessageId === m.id && voiceLoading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                Dinle
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
