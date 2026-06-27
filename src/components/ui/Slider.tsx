"use client";

import { useId } from "react";
import { cx } from "@/lib/utils";

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  label: string;
  hint?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
};

export function Slider({
  value,
  min,
  max,
  step = 0.05,
  onChange,
  label,
  hint,
  formatValue,
  disabled,
}: SliderProps) {
  const id = useId();
  const display = formatValue ? formatValue(value) : value.toFixed(2);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="stage-stamp">
          {label}
        </label>
        <span className="font-mono text-sm text-ink" aria-live="polite">
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cx(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-paper-deep accent-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          disabled && "cursor-not-allowed opacity-60",
        )}
      />
      {hint ? <p className="text-xs text-ink-mute">{hint}</p> : null}
    </div>
  );
}
