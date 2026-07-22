"use client";

import { useId } from "react";
import { cx } from "@/lib/utils";

export type CheckboxProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  name?: string;
};

export function Checkbox({ checked, onChange, label, description, disabled, name }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 bg-paper px-4 py-3 transition-colors duration-200 hover:border-ink/20",
        checked && "border-terracotta bg-terracotta/5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        name={name}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-ink/30 text-terracotta focus:ring-terracotta"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs text-ink-mute">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
