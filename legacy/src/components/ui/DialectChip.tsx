import type { Dialect } from "@/lib/auth/types";

export function DialectChip({ variant }: { variant: Dialect }) {
  return (
    <span className="pill">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-moss" />
      European · {variant}
    </span>
  );
}
