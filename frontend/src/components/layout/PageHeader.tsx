import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        {breadcrumb && (
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--brand)]">
            {breadcrumb}
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{description}</p>
            )}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-6xl px-4 py-6 md:px-8 ${className}`}>{children}</div>
  );
}
