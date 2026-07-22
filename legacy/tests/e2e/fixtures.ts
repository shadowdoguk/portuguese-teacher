import type { BrowserContext, Page } from "@playwright/test";

export const DEMO_USER = {
  id: "demo-learner-001",
  name: "Demo Learner",
  email: "demo@portugues.app",
  dialect: "pt-PT",
  level: "A0",
  streakDays: 4,
  weeklyMinutes: 95,
  createdAt: "2026-06-01T00:00:00.000Z",
  nativeLanguage: "en-GB",
  selfAssessmentLevel: "A0",
  goals: ["travel", "heritage"],
  placementAttempts: [],
};

export const SETTINGS_STORAGE_KEY = "portuguese-teacher:settings:demo-learner-001";

/**
 * Name of the auth cookie set by `AuthProvider` (issue #133). Mirrors
 * the Learner ID into a short-lived cookie for the edge middleware.
 */
export const AUTH_COOKIE_NAME = "portuguese-teacher:auth";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

const DEFAULT_SETTINGS = {
  voiceSpeed: 1.0,
  cfTiming: "immediate",
  captions: "on",
  reducedMotion: "auto",
  textOnlyMode: false,
  retrievalMode: "text+audio",
  voiceRecordingOptIn: false,
  confidenceCheckinOptIn: false,
  weeklyGoalMinutes: 105,
  ttsVoice: {
    id: "minimax-pt-pt-female-1",
    dialect: "pt-PT",
    label: "Catarina (pt-PT, female)",
  },
};

/**
 * Seeds both the auth cookie AND the per-Learner localStorage so the
 * page hydrates as authenticated on the very first navigation. This
 * avoids the redirect-to-/log-in race that would otherwise happen
 * because `AuthProvider` only writes the cookie inside a `useEffect`
 * that fires after hydration.
 *
 * Used by E2E specs (`tests/e2e/smoke-suite.spec.ts`,
 * `tests/e2e/visual-regression.spec.ts`) and the LHCI authenticated-run
 * fixture (`tests/e2e/fixtures.ts`).
 */
export async function signInAsDemoLearner(
  pageOrContext: Page | BrowserContext,
): Promise<void> {
  const context: BrowserContext =
    "addCookies" in pageOrContext
      ? pageOrContext
      : pageOrContext.context();
  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: encodeURIComponent(DEMO_USER.id),
      domain: "127.0.0.1",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE_SECONDS,
      sameSite: "Lax",
    },
  ]);
  await pageOrContext.addInitScript(
    ({ user, settingsKey, settings }) => {
      window.localStorage.setItem("portuguese-teacher:user", JSON.stringify(user));
      window.localStorage.setItem(settingsKey, JSON.stringify(settings));
      // Mirror the cookie into `document.cookie` too — Playwright's
      // `addCookies()` already wrote it on the context, but jsdom-style
      // sanity check inside AuthProvider keeps the two sources in sync.
      document.cookie = `${"portuguese-teacher:auth"}=${encodeURIComponent(user.id)}; Max-Age=${60 * 60 * 24}; Path=/; SameSite=Lax`;
    },
    { user: DEMO_USER, settingsKey: SETTINGS_STORAGE_KEY, settings: DEFAULT_SETTINGS },
  );
}

export async function spoofUserAgent(
  page: Page,
  userAgent: string,
): Promise<void> {
  await page.addInitScript((ua) => {
    const apply = () => {
      try {
        Object.defineProperty(Navigator.prototype, "userAgent", {
          get: () => ua,
          configurable: true,
        });
      } catch {
        try {
          Object.defineProperty(navigator, "userAgent", {
            get: () => ua,
            configurable: true,
          });
        } catch {
          // best-effort; some browsers lock navigator.userAgent
        }
      }
    };
    apply();
  }, userAgent);
}

export const CHROMIUM_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

export const FIREFOX_UA =
  "Mozilla/5.0 (X86_64; rv:125.0) Gecko/20100101 Firefox/125.0";

/**
 * Convenience routes that the LHCI authenticated runs target (ADR-0005
 * §2 "Authenticated LHCI runs for /dashboard, /review, /practice" — was
 * a v1 GA blocker; PR-133 + PR-105 + #145 unblock it).
 */
export const AUTHENTICATED_LHCI_ROUTES = [
  "http://localhost:3000/dashboard",
  "http://localhost:3000/review",
  "http://localhost:3000/practice",
  "http://localhost:3000/profile",
] as const;
