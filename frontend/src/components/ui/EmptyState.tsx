import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center">
      {icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
      {description && (
        <div className="max-w-sm text-xs text-[var(--text-secondary)]">{description}</div>
      )}
      {action}
    </div>
  );
}
