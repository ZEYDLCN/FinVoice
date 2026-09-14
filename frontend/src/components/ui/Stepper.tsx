import { Check } from "lucide-react";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "upcoming";
        return (
          <li key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  state === "done"
                    ? "bg-[var(--success)] text-white"
                    : state === "active"
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--surface-hover)] text-[var(--text-muted)]"
                }`}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={`text-xs font-medium ${
                  state === "upcoming" ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="mx-1 h-px w-6 bg-[var(--border-strong)]" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
