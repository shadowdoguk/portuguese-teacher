/**
 * Pre-audit puppeteer cookie + localStorage seeder for `lhci autorun`
 * authenticated runs (ADR-0005 §2 "Authenticated LHCI runs for
 * /dashboard, /review, /practice"). The default LHCI config audits the
 * four public routes (lighthouserc.json) without a Learner session; this
 * script seeds the same demo-learner state the Playwright fixture writes
 * (`tests/e2e/fixtures.ts:signInAsDemoLearner`) so the auth-gated app
 * pages render as authenticated.
 *
 * Persisted via `settings.disableStorageReset: true` in
 * `lighthouserc.auth.json` — otherwise Lighthouse would clear
 * localStorage + cookies between runs and the auth state wouldn't survive.
 *
 * Invoked once per LHCI URL block (LHCI's browser/context stays open
 * across all audited URLs in one `autorun` invocation).
 *
 * @param {import('puppeteer-core').Browser} browser — opened by LHCI; we
 *   open a temporary page, set cookie + localStorage, then close.
 * @param {{url: string}} context — `{ url }` carries the URL LHCI is
 *   about to audit; we derive the same-origin URL to navigate to.
 */

const DEMO_USER_ID = "demo-learner-001";

const DEMO_USER = {
  id: DEMO_USER_ID,
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

const SETTINGS_STORAGE_KEY = `portuguese-teacher:settings:${DEMO_USER_ID}`;

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

const AUTH_COOKIE_NAME = "portuguese-teacher:auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

module.exports = async (browser, context) => {
  const targetOrigin = new URL(context.url).origin;

  const page = await browser.newPage();
  await page.goto(targetOrigin + "/", { waitUntil: "domcontentloaded" });

  await page.setCookie({
    name: AUTH_COOKIE_NAME,
    value: encodeURIComponent(DEMO_USER_ID),
    url: targetOrigin + "/",
    expires: Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: "Lax",
  });

  await page.evaluate(
    ({ user, settingsKey, settings }) => {
      window.localStorage.setItem(
        "portuguese-teacher:user",
        JSON.stringify(user),
      );
      window.localStorage.setItem(settingsKey, JSON.stringify(settings));
    },
    { user: DEMO_USER, settingsKey: SETTINGS_STORAGE_KEY, settings: DEFAULT_SETTINGS },
  );

  await page.close();
};
