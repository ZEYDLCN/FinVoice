import type { ReactNode } from "react";
import { Card } from "./Card";

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
}) {
  const iconTone =
    tone === "brand"
      ? "bg-[var(--brand-soft)] text-[var(--brand)]"
      : tone === "success"
        ? "bg-[var(--success-soft)] text-[var(--success)]"
        : tone === "warning"
          ? "bg-[var(--warning-soft)] text-[var(--warning)]"
          : tone === "danger"
            ? "bg-[var(--danger-soft)] text-[var(--danger)]"
            : "bg-[var(--surface-hover)] text-[var(--text-secondary)]";

  return (
    <Card>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs font-medium text-[var(--text-secondary)]">{label}</div>
          <div className="truncate text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {value}
          </div>
        </div>
      </div>
      {hint && <div className="mt-2 text-xs text-[var(--text-muted)]">{hint}</div>}
    </Card>
  );
}
