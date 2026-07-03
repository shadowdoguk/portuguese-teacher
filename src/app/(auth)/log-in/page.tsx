import { Suspense } from "react";
import { LogInForm } from "./LogInForm";

/**
 * Server-component wrapper for /log-in.
 *
 * The form uses useSearchParams() (to honor ?next= per PR #114, issue
 * #110). Next.js 14 requires useSearchParams() to live inside a Suspense
 * boundary for static prerendering. This page is the boundary — the
 * fallback is a thin skeleton while the client form hydrates.
 *
 * Following-up fix to PR #114. The original fix moved useSearchParams
 * into the page component but didn't add the Suspense boundary, so
 * `next build` failed at the /log-in static-export step.
 */
export default function LogInPage() {
  return (
    <Suspense fallback={<LogInFallback />}>
      <LogInForm />
    </Suspense>
  );
}

function LogInFallback() {
  return (
    <div className="w-full max-w-md">
      <span className="stage-stamp">Log in</span>
      <h1 className="mt-3 text-display-md font-display font-light text-pretty">
        Welcome back.
      </h1>
      <p className="mt-3 text-pretty text-ink-soft">
        Loading your sign-in…
      </p>
    </div>
  );
}