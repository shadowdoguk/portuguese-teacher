import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-ink/10 bg-paper-warm/40">
      <div className="container-edge grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-xl text-ink">Português</p>
          <p className="mt-3 max-w-sm text-sm text-ink-soft">
            An AI-driven Portuguese teacher. From zero to a held opinion, in the
            time you actually have.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { href: "/sign-up", label: "Start learning" },
            { href: "/log-in", label: "Log in" },
            { href: "#how-it-works", label: "Method" },
          ]}
        />
        <FooterCol
          title="Practice"
          links={[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/practice", label: "Conversational practice" },
            { href: "/review", label: "Vocabulary review" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "/settings", label: "Privacy & data" },
            { href: "/settings", label: "Settings" },
            { href: "/settings", label: "Accessibility" },
          ]}
        />
      </div>

      <div className="container-edge flex flex-col items-start justify-between gap-3 border-t border-ink/10 py-6 text-xs text-ink-mute md:flex-row md:items-center">
        <span>© {new Date().getFullYear()} Português · Built with MiniMax.</span>
        <span className="font-mono uppercase tracking-[0.2em]">
          pt-BR · pt-PT · A0 → B1
        </span>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="stage-stamp">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-ink-soft hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}