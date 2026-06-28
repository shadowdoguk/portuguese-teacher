"use client";

import { useId } from "react";
import { cx } from "@/lib/utils";

export type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  name?: string;
};

export function Toggle({ checked, onChange, label, description, disabled, name }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p className="mt-1 text-xs text-ink-mute">{description}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        name={name}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          checked
            ? "border-terracotta bg-terracotta"
            : "border-ink/20 bg-paper-warm",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          aria-hidden
          className={cx(
            "inline-block h-4 w-4 transform rounded-full bg-paper shadow-soft transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
