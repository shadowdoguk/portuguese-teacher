"use client";

import { useAuth } from "@/lib/auth/useAuth";

export function DialectPicker() {
  const { user } = useAuth();
  const current = user?.dialect ?? "pt-PT";

  return (
    <fieldset className="space-y-3">
      <legend className="stage-stamp">Dialect</legend>
      <div className="rounded-xl border border-terracotta bg-terracotta/5 p-4 shadow-soft">
        <span className="font-display text-base text-ink">European Portuguese</span>
        <span className="mt-1 block text-xs text-ink-mute">Lisboa · Porto</span>
        <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-terracotta">
          Selected · {current}
        </span>
      </div>
      <p className="text-xs text-ink-mute">
        v1 ships European Portuguese only. Brazilian Portuguese is on the v1.1
        roadmap — see ADR-0003.
      </p>
    </fieldset>
  );
}
