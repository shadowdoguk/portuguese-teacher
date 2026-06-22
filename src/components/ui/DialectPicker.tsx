"use client";

import { useAuth } from "@/lib/auth/useAuth";

type Dialect = "pt-BR" | "pt-PT";

export function DialectPicker() {
  const { user, setDialect } = useAuth();
  const current = user?.dialect ?? "pt-BR";

  return (
    <fieldset className="space-y-3">
      <legend className="stage-stamp">Dialect</legend>
      <div className="grid grid-cols-2 gap-3">
        <DialectOption
          value="pt-BR"
          current={current}
          onSelect={(v) => setDialect(v)}
          label="Brazilian Portuguese"
          hint="Rio · São Paulo"
        />
        <DialectOption
          value="pt-PT"
          current={current}
          onSelect={(v) => setDialect(v)}
          label="European Portuguese"
          hint="Lisboa · Porto"
        />
      </div>
    </fieldset>
  );
}

function DialectOption({
  value,
  current,
  onSelect,
  label,
  hint,
}: {
  value: Dialect;
  current: Dialect;
  onSelect: (v: Dialect) => void;
  label: string;
  hint: string;
}) {
  const isCurrent = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={isCurrent}
      className={`group flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all duration-200 ease-out-expo ${
        isCurrent
          ? "border-terracotta bg-terracotta/5 shadow-soft"
          : "border-ink/10 bg-paper-warm/60 hover:border-ink/25 hover:bg-paper-warm"
      }`}
    >
      <span className="font-display text-base text-ink">{label}</span>
      <span className="text-xs text-ink-mute">{hint}</span>
      <span
        className={`mt-2 font-mono text-[10px] uppercase tracking-[0.2em] ${
          isCurrent ? "text-terracotta" : "text-ink-mute"
        }`}
      >
        {isCurrent ? "Selected" : value}
      </span>
    </button>
  );
}