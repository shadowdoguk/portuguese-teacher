import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="stage-stamp">404 · Página não encontrada</span>
        <h1 className="mt-4 font-display text-display-lg font-light text-pretty">
          We can’t find that page.
        </h1>
        <p className="mt-4 text-pretty text-ink-soft">
          The link may have moved, or the page may never have existed. Head back to
          the dashboard and pick up where you left off.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            Go home
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}