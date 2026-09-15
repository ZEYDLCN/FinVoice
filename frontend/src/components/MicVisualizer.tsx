"use client";

import { Mic, MicOff, Radio } from "lucide-react";
import { useMicrophone } from "@/hooks/useMicrophone";

const BAR_COUNT = 18;

export function MicVisualizer() {
  const { status, level, error, start, stop } = useMicrophone();
  const isActive = status === "granted";

  return (
    <div className="ambient-card glass-panel grid min-h-40 gap-5 rounded-[24px] p-5 sm:grid-cols-[1fr_auto] sm:items-center md:p-6">
      <div>
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]"><Radio className="h-3.5 w-3.5" /> Voice Gateway</div>
        <h3 className="text-xl font-medium tracking-[-0.035em] text-[var(--text-primary)]">Sesinizi duymaya hazır.</h3>
        <p className="mt-2 max-w-lg text-xs leading-5 text-[var(--text-secondary)]">Mikrofon seviyesini canlı izleyin veya aşağıdaki alandan mesajınızı yazın.</p>
        <div className="mt-5 flex h-9 items-center gap-1">
          {Array.from({ length: BAR_COUNT }).map((_, index) => {
            const distance = Math.abs(index - (BAR_COUNT - 1) / 2);
            const shapeHeight = 10 + (1 - distance / (BAR_COUNT / 2)) * 22;
            const on = isActive && level > index / BAR_COUNT;
            return <span key={index} className={`w-1 rounded-full transition-all duration-75 ${on ? "bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" : "bg-[var(--border-strong)]"}`} style={{ height: on ? Math.max(shapeHeight, level * 38) : shapeHeight * 0.55 }} />;
          })}
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
          {status === "idle" && "Mikrofon kapalı · Metinle devam edebilirsiniz"}
          {status === "requesting" && "Mikrofon izni bekleniyor..."}
          {status === "granted" && "Mikrofon açık · Ses seviyesi izleniyor"}
          {(status === "denied" || status === "error") && (error ?? "Mikrofona erişilemedi")}
        </p>
      </div>
      <button onClick={isActive ? stop : start} className={`relative flex h-20 w-20 items-center justify-center justify-self-center rounded-full transition duration-300 ${isActive ? "bg-[var(--danger)] text-white" : "bg-[var(--brand)] text-[var(--brand-ink)] shadow-[0_0_0_12px_var(--brand-soft),0_20px_45px_rgba(130,243,170,.18)] hover:scale-105"}`} aria-label={isActive ? "Mikrofonu kapat" : "Mikrofonu aç"}>
        {isActive ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
      </button>
    </div>
  );
}
