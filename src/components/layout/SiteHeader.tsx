import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

type Variant = "marketing" | "app";

export function SiteHeader({ variant = "app" }: { variant?: Variant }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/80 backdrop-blur-md">
      <div className="container-edge flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="Português — home">
          <Logo className="h-7 w-7 text-ink" />
          <span className="font-display text-lg font-medium tracking-tight">
            Português
          </span>
        </Link>

        {variant === "marketing" ? <MarketingNav /> : <AppNav />}
      </div>
    </header>
  );
}

function MarketingNav() {
  return (
    <nav aria-label="Primary" className="flex items-center gap-2">
      <Link href="#how-it-works" className="hidden text-sm text-ink-soft hover:text-ink md:inline-flex">
        Method
      </Link>
      <Link href="/log-in" className="btn-ghost px-4 py-2 text-xs">
        Log in
      </Link>
      <Link href="/sign-up" className="btn-primary px-4 py-2 text-xs">
        Start learning
      </Link>
    </nav>
  );
}

function AppNav() {
  return (
    <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
      <Link href="/dashboard" className="rounded-full px-3 py-1.5 text-ink-soft hover:bg-paper-warm hover:text-ink">
        Dashboard
      </Link>
      <Link href="/practice" className="rounded-full px-3 py-1.5 text-ink-soft hover:bg-paper-warm hover:text-ink">
        Practice
      </Link>
      <Link href="/review" className="rounded-full px-3 py-1.5 text-ink-soft hover:bg-paper-warm hover:text-ink">
        Review
      </Link>
      <Link href="/profile" className="ml-2 grid h-8 w-8 place-items-center rounded-full bg-ink text-paper">
        <span className="font-mono text-xs">DA</span>
      </Link>
    </nav>
  );
}