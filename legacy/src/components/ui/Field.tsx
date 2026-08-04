import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({ label, name, hint, error, required, children, className }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <label htmlFor={name} className={cx("block", className)}>
      <span className="stage-stamp block pb-1.5">
        {label}
        {required ? <span className="ml-1 text-terracotta-deep">*</span> : null}
      </span>
      {children}
      {hint ? (
        <span id={hintId} className="mt-1 block text-xs text-ink-mute">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="mt-1 block text-xs text-terracotta-deep">
          {error}
        </span>
      ) : null}
      {describedBy ? (
        <span data-described-by={describedBy} hidden>
          {describedBy}
        </span>
      ) : null}
    </label>
  );
}

export function textInputClassName(hasError?: boolean) {
  return cx(
    "w-full rounded-lg border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-mute/60 focus:outline-none",
    hasError
      ? "border-terracotta focus:border-terracotta"
      : "border-ink/15 focus:border-terracotta",
  );
}
