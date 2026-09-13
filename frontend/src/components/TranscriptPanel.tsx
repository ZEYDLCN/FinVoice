"use client";

import { useEffect, useRef } from "react";
import type { TranscriptMessage } from "@/lib/types";

export function TranscriptPanel({ messages }: { messages: TranscriptMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Gerçek Zamanlı Transcript</h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Henüz bir konuşma yok. Aşağıdan bir mesaj gönderin — örn. &quot;Arabamla kaza
            yaptım, hasar dosyası açtırmak istiyorum.&quot;
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "customer" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "customer"
                  ? "bg-sky-600 text-white"
                  : m.role === "ai"
                    ? "bg-slate-800 text-slate-100"
                    : "bg-amber-900/40 text-amber-200"
              }`}
            >
              {m.text}
            </span>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
              {m.role === "customer" ? "Müşteri" : m.role === "ai" ? "FinVoice AI" : "Sistem"}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
