"use client";

import { useMicrophone } from "@/hooks/useMicrophone";

const BAR_COUNT = 12;

export function MicVisualizer() {
  const { status, level, error, start, stop } = useMicrophone();
  const isActive = status === "granted";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Voice Gateway</h3>
          <p className="text-xs text-slate-500">
            Faz 3&apos;te Silero VAD + faster-whisper&apos;a bağlanacak
          </p>
        </div>
        <button
          onClick={isActive ? stop : start}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            isActive
              ? "bg-red-600/90 text-white hover:bg-red-600"
              : "bg-emerald-600/90 text-white hover:bg-emerald-600"
          }`}
        >
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
                on ? "bg-emerald-400" : "bg-slate-700"
              }`}
              style={{ height: on ? `${20 + threshold * 80}%` : "15%" }}
            />
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        {status === "idle" && "Mikrofon kapalı — aşağıdaki metin kutusunu kullanın."}
        {status === "requesting" && "İzin isteniyor..."}
        {status === "granted" && "Dinleniyor (yalnızca seviye ölçümü — STT henüz bağlı değil)"}
        {status === "denied" && (error ?? "Mikrofon izni reddedildi.")}
        {status === "error" && (error ?? "Bir hata oluştu.")}
      </p>
    </div>
  );
}
