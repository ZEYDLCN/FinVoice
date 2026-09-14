import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:opacity-50",
  secondary:
    "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--brand)] disabled:opacity-50",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50",
  danger: "bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  icon,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
