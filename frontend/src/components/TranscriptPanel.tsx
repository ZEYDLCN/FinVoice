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
            {m.role === "ai" && (
              <button
                type="button"
                onClick={() => onSpeak(m)}
                className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-[var(--brand)] transition-colors hover:bg-[var(--surface-hover)]"
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
