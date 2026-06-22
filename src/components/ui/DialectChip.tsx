type Dialect = "pt-BR" | "pt-PT";

export function DialectChip({ variant }: { variant: Dialect }) {
  const label = variant === "pt-BR" ? "Brazilian" : "European";
  return (
    <span className="pill">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-moss" />
      {label} · {variant}
    </span>
  );
}