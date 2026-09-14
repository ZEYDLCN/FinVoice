"use client";

import { useState, type FormEvent } from "react";
import { RotateCcw, Send } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Arabamla kaza yaptım, hasar dosyası açtırmak istiyorum.",
  "Hasar dosyamın durumunu öğrenmek istiyorum.",
  "Kaskom çekici hizmetini kapsıyor mu?",
  "Kartımı kaybettim.",
];

export function ChatConsole({
  onSend,
  onReset,
  disabled,
}: {
  onSend: (text: string) => void;
  onReset: () => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onSend(p)}
            className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="Mesajınızı yazın..."
          className="flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Gönder
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Sıfırla
        </button>
      </form>
    </div>
  );
}
