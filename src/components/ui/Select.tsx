"use client";

import { useId } from "react";
import { cx } from "@/lib/utils";

export type Option<T extends string> = { value: T; label: string };

export type SelectProps<T extends string> = {
  value: T;
  options: ReadonlyArray<Option<T> | T>;
  onChange: (next: T) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  ariaLabel?: string;
  "data-testid"?: string;
};

function normalize<T extends string>(
  options: SelectProps<T>["options"],
): Option<T>[] {
  return options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  hint,
  disabled,
  ariaLabel,
  ...rest
}: SelectProps<T>) {
  const id = useId();
  const normalized = normalize(options);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="stage-stamp block">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onChange={(event) => onChange(event.target.value as T)}
        data-testid={rest["data-testid"]}
        className={cx(
          "w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-base text-ink focus:border-terracotta focus:outline-none",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-ink-mute">{hint}</p> : null}
    </div>
  );
}
