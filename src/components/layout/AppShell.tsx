import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader variant="app" />
      <div className="container-edge grid flex-1 gap-10 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <SidebarNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav() {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/practice", label: "Practice" },
    { href: "/review", label: "Review" },
    { href: "/progress", label: "Progress" },
    { href: "/profile", label: "Profile" },
    { href: "/settings", label: "Settings" },
  ];
  return (
    <nav aria-label="Sections" className="sticky top-24 space-y-1">
      <p className="stage-stamp px-3 pb-2">Sections</p>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="block rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors duration-200 hover:bg-paper-warm hover:text-ink"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}