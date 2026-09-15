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
    <div className="px-3 pb-2 pt-8 md:px-7 md:pt-10">
      <div className="mx-auto max-w-7xl">
        {breadcrumb && (
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">
            {breadcrumb}
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-[-0.045em] text-[var(--text-primary)] md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
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
    <div className={`mx-auto max-w-7xl px-3 py-5 md:px-7 md:py-7 ${className}`}>{children}</div>
  );
}
