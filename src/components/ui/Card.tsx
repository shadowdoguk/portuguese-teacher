import type { ReactNode } from "react";

export function Card({
  title,
  eyebrow,
  children,
  footer,
}: {
  title?: string;
  eyebrow?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="card-surface flex flex-col gap-4">
      {(eyebrow || title) && (
        <header className="space-y-1">
          {eyebrow ? <p className="stage-stamp">{eyebrow}</p> : null}
          {title ? <h3 className="font-display text-xl text-ink">{title}</h3> : null}
        </header>
      )}
      <div className="text-pretty text-ink-soft">{children}</div>
      {footer ? <footer className="hairline pt-4 text-sm">{footer}</footer> : null}
    </article>
  );
}