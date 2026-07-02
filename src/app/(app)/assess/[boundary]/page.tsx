import { notFound } from "next/navigation";
import { isLevelBoundary } from "@/lib/assessment";
import AssessBoundaryClient from "./AssessBoundaryClient";

// Server-side boundary validation (issue #T-328). The client component
// re-checks the boundary inside `useEffect` for the client-only UX (it
// renders a friendly error state if the URL is somehow stale), but the
// authoritative check is here so invalid boundaries return a real HTTP
// 404 instead of a 200 with an "Unknown boundary" inline message.
//
// Case-insensitive on the way in (URL paths are case-sensitive per RFC,
// but humans type `/assess/a0-a1` and expect the canonical `A0-A1` form
// to work) — we normalise to uppercase before the lookup, so the client
// component receives the canonical boundary string in `params`.
function normaliseBoundary(raw: string): string {
  return raw.toUpperCase();
}

export default function AssessBoundaryPage({
  params,
}: {
  params: { boundary: string };
}) {
  const boundary = normaliseBoundary(params.boundary);
  if (!isLevelBoundary(boundary)) {
    notFound();
  }
  return <AssessBoundaryClient params={{ boundary }} />;
}