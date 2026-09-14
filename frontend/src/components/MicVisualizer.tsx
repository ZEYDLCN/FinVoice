"use client";

import { Mic, MicOff } from "lucide-react";
import { useMicrophone } from "@/hooks/useMicrophone";

const BAR_COUNT = 12;

export function MicVisualizer() {
  const { status, level, error, start, stop } = useMicrophone();
  const isActive = status === "granted";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Voice Gateway</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Ses seviyesi ölçümü — gerçek VAD/STT boru hattı{" "}
            <code className="text-[var(--text-secondary)]">voice/</code> servisinde çalışıyor
          </p>
        </div>
        <button
          onClick={isActive ? stop : start}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            isActive
              ? "bg-[var(--danger)] text-white hover:opacity-90"
              : "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]"
          }`}
        >
          {isActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isActive ? "Durdur" : "Mikrofonu Aç"}
        </button>
      </div>

      <div className="mt-4 flex h-12 items-end justify-center gap-1">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const threshold = i / BAR_COUNT;
          const on = isActive && level > threshold;
          return (
            <div
              key={i}
              className={`w-2 rounded-sm transition-all duration-75 ${
                on ? "bg-[var(--accent)]" : "bg-[var(--surface-hover)]"
              }`}
              style={{ height: on ? `${20 + threshold * 80}%` : "15%" }}
            />
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        {status === "idle" && "Mikrofon kapalı — aşağıdaki metin kutusunu kullanın."}
        {status === "requesting" && "İzin isteniyor..."}
        {status === "granted" && "Dinleniyor (bu konsolda yalnızca seviye ölçümü)"}
        {status === "denied" && (error ?? "Mikrofon izni reddedildi.")}
        {status === "error" && (error ?? "Bir hata oluştu.")}
      </p>
    </div>
  );
}
