import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function Wrapper({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-[var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-[var(--text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] disabled:opacity-50";

export function TextField({
  label,
  hint,
  error,
  ...rest
}: { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrapper label={label} hint={hint} error={error}>
      <input className={inputClass} {...rest} />
    </Wrapper>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  ...rest
}: { label: string; hint?: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrapper label={label} hint={hint} error={error}>
      <textarea className={`${inputClass} min-h-[88px] resize-y`} {...rest} />
    </Wrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  ...rest
}: { label: string; hint?: string; error?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrapper label={label} hint={hint} error={error}>
      <select className={inputClass} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
}
