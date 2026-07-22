export function isDemoMode(): boolean {
  // The mock-mode flag is injected by Next.js at build/dev time as a
  // string ("1" / "true" / "yes" / "on"). Any truthy value enables the
  // banner; an unset env (production real-auth mode) leaves it hidden.
  const raw = process.env.NEXT_PUBLIC_MOCK;
  if (!raw) return false;
  const normalised = raw.trim().toLowerCase();
  return normalised === "1" || normalised === "true" || normalised === "yes" || normalised === "on";
}