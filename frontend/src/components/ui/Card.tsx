import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; padded?: boolean }) {
  return (
    <div
      className={`glass-panel rounded-[22px] ${
        padded ? "p-5 md:p-6" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
