import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";

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
  const linkClass =
    "rounded-full px-3 py-1.5 text-ink-soft hover:bg-paper-warm hover:text-ink";

  return (
    <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
      {/* Desktop: inline links (≥ md) */}
      <div className="hidden items-center gap-1 md:flex">
        <Link href="/dashboard" className={linkClass}>
          Dashboard
        </Link>
        <Link href="/practice" className={linkClass}>
          Practice
        </Link>
        <Link href="/review" className={linkClass}>
          Review
        </Link>
      </div>

      {/* Mobile (< md): <details>-based menu anchored to the avatar.
          <details>/<summary> gives us free keyboard + Escape handling + a11y. */}
      <details className="relative md:hidden">
        <summary
          aria-label="Open menu"
          data-testid="appnav-mobile-toggle"
          className="ml-2 grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full bg-ink text-paper [&::-webkit-details-marker]:hidden"
        >
          <span className="font-mono text-xs">DA</span>
        </summary>
        <div
          data-testid="appnav-mobile-menu"
          className="absolute right-0 top-full z-50 mt-2 flex w-48 flex-col gap-1 rounded-lg border border-ink/10 bg-paper p-2 shadow-lg"
        >
          <Link href="/dashboard" className={linkClass}>
            Dashboard
          </Link>
          <Link href="/practice" className={linkClass}>
            Practice
          </Link>
          <Link href="/review" className={linkClass}>
            Review
          </Link>
          <Link href="/profile" className={linkClass}>
            Profile
          </Link>
          <hr className="my-1 border-ink/10" />
          <SignOutButton variant="link" className="justify-start" />
        </div>
      </details>

      {/* Desktop: avatar link to /profile + inline sign-out (≥ md) */}
      <Link
        href="/profile"
        aria-label="Open profile"
        className="ml-2 hidden h-8 w-8 place-items-center rounded-full bg-ink text-paper md:grid"
      >
        <span className="font-mono text-xs">DA</span>
      </Link>
      <SignOutButton
        variant="link"
        className="ml-1 hidden rounded-full px-3 py-1.5 text-ink-soft hover:bg-paper-warm hover:text-ink md:inline-flex"
      />
    </nav>
  );
}