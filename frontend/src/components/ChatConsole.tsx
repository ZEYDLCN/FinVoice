"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "TR-92831 poliçem aktif mi?",
  "Hasar dosyamın durumunu öğrenmek istiyorum.",
  "TR-92831 poliçem çekiciyi kapsıyor mu?",
  "Kartımı kaybettim.",
];

export function ChatConsole({ onSend, onReset, disabled }: { onSend: (text: string) => void; onReset: () => void; disabled: boolean }) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="glass-panel rounded-[22px] p-3">
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="flex shrink-0 items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]"><Sparkles className="h-3 w-3" /> Öneriler</span>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" disabled={disabled} onClick={() => onSend(prompt)} className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--text-primary)] disabled:opacity-40">
            {prompt}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-hover)] p-1.5 transition focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[var(--brand-soft)]">
        <input value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} placeholder="FinVoice’a bir şey sorun..." className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
        <button type="button" onClick={onReset} disabled={disabled} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:opacity-40" aria-label="Konuşmayı sıfırla"><RotateCcw className="h-4 w-4" /></button>
        <button type="submit" disabled={disabled || !value.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--brand-ink)] shadow-[0_8px_24px_rgba(130,243,170,.2)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-hover)] disabled:opacity-30" aria-label="Mesajı gönder"><ArrowUp className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
