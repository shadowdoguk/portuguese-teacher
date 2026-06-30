import type { Page } from "@playwright/test";

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

export async function signInAsDemoLearner(page: Page): Promise<void> {
  await page.addInitScript(
    ({ user, settingsKey, settings }) => {
      window.localStorage.setItem("portuguese-teacher:user", JSON.stringify(user));
      window.localStorage.setItem(settingsKey, JSON.stringify(settings));
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
  "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0";