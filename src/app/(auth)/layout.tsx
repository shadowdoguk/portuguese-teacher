import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden bg-ink text-paper lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_30%_20%,rgba(194,65,12,0.18),transparent_60%)]" />
        <div className="relative flex h-full flex-col p-12">
          <Link href="/" className="flex items-center gap-2.5 text-paper">
            <Logo className="h-7 w-7 text-paper" />
            <span className="font-display text-lg font-medium">Português</span>
          </Link>

          <div className="mt-auto">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-terracotta-soft">
              A teacher, not an app
            </span>
            <p className="mt-4 max-w-md text-pretty font-display text-3xl font-light leading-tight">
              Five minutes today. A conversation next month. A dinner in Lisbon next year.
            </p>
            <p className="mt-6 max-w-md text-pretty text-paper/70">
              — From the Português method brief.
            </p>
          </div>
        </div>
      </aside>

      <main className="grid place-items-center px-6 py-12 lg:py-20">{children}</main>
    </div>
  );
}