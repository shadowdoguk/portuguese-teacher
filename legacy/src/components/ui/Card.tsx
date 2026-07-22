import { createElement, type ReactNode } from "react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function Card({
  title,
  eyebrow,
  children,
  footer,
  titleAs = "h3",
}: {
  title?: string;
  eyebrow?: string;
  children?: ReactNode;
  footer?: ReactNode;
  titleAs?: HeadingLevel;
}) {
  return (
    <article className="card-surface flex flex-col gap-4">
      {(eyebrow || title) && (
        <header className="space-y-1">
          {eyebrow ? <p className="stage-stamp">{eyebrow}</p> : null}
          {title
            ? createElement(
                titleAs,
                { className: "font-display text-xl text-ink" },
                title,
              )
            : null}
        </header>
      )}
      <div className="text-pretty text-ink-soft">{children}</div>
      {footer ? <footer className="hairline pt-4 text-sm">{footer}</footer> : null}
    </article>
  );
}