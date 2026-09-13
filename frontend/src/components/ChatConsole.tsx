"use client";

import { useState, type FormEvent } from "react";

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
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onSend(p)}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-sky-300 disabled:opacity-40"
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
          placeholder="Mesajınızı yazın... (metin modu — ses Faz 3'te)"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
        >
          Gönder
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200 disabled:opacity-50"
        >
          Sıfırla
        </button>
      </form>
    </div>
  );
}
