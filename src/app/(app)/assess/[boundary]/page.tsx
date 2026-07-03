import { notFound } from "next/navigation";
import { isLevelBoundary, milestoneByBoundary } from "@/lib/assessment";
import { A0_CURRICULUM } from "@/lib/curriculum";
import type { LevelBoundary } from "@/lib/curriculum";
import AssessClient from "./AssessClient";

type Params = { boundary: string };

/**
 * Server-side guard for the Milestone assessment route.
 *
 * Issue #120: previously the page was a client component that validated
 * the `boundary` param inside `useEffect`, so the server returned HTTP 200
 * with a "Loading…" placeholder for any URL — including nonsense like
 * `/assess/x0-x1`. That broke SEO, crawler hygiene, and the REST
 * contract.
 *
 * Now we validate server-side: normalise case, check against the
 * canonical boundary list, AND confirm a milestone is actually registered
 * for that boundary in the current curriculum. Anything else gets
 * `notFound()` (HTTP 404). The client component still re-validates
 * defensively, but the happy path never reaches it for invalid inputs.
 */
export default async function AssessBoundaryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { boundary: rawBoundary } = await params;
  const boundary = rawBoundary.toUpperCase();
  if (!isLevelBoundary(boundary)) {
    notFound();
  }
  const milestone = milestoneByBoundary(A0_CURRICULUM, boundary as LevelBoundary);
  if (!milestone) {
    notFound();
  }
  return <AssessClient boundary={boundary as LevelBoundary} />;
}