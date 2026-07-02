import { isDemoMode } from "@/lib/auth/demoMode";

/**
 * Inline notice shown on /log-in and /sign-up when the platform is
 * running in mock-auth mode (`NEXT_PUBLIC_MOCK=1`). Tells reviewers /
 * testers that credentials are NOT validated in this mode — they can
 * sign in as any email and any password to explore as the demo learner.
 *
 * Issue #113. The notice is informational (`role="status"`), not
 * an error or warning — the sign-in / sign-up flows still work as
 * designed in mock mode.
 */
export function DemoModeBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      role="status"
      data-testid="demo-mode-banner"
      className="mb-6 rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-ink"
    >
      <p>
        <strong className="stage-stamp text-terracotta-deep">Demo mode</strong>
        <span className="ml-2 text-ink-soft">
          Credentials are not validated. Sign in with any email and any
          password to explore as the demo learner.
        </span>
      </p>
    </div>
  );
}