import type { Learner } from "./types";
import { DEFAULT_NATIVE_LANGUAGE, DEFAULT_SELF_ASSESSMENT } from "./types";

const DEMO_USER: Learner = {
  id: "demo-learner-001",
  name: "Demo Learner",
  email: "demo@portugues.app",
  dialect: "pt-PT",
  level: "A0",
  streakDays: 4,
  weeklyMinutes: 95,
  createdAt: "2026-06-01T00:00:00.000Z",
  nativeLanguage: DEFAULT_NATIVE_LANGUAGE,
  selfAssessmentLevel: DEFAULT_SELF_ASSESSMENT,
  goals: ["travel", "heritage"],
};

function delay<T>(value: T, ms = 240): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function mockSignIn(email: string, _password: string): Promise<Learner> {
  return delay<Learner>({
    ...DEMO_USER,
    nativeLanguage: DEMO_USER.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE,
    selfAssessmentLevel: DEMO_USER.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT,
    goals: DEMO_USER.goals ?? [],
    email: email.trim() || DEMO_USER.email,
  });
}

export async function mockSignUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Learner> {
  return delay<Learner>({
    ...DEMO_USER,
    name: input.name.trim() || DEMO_USER.name,
    email: input.email.trim() || DEMO_USER.email,
    id: `learner-${Date.now()}`,
    createdAt: new Date().toISOString(),
    nativeLanguage: DEFAULT_NATIVE_LANGUAGE,
    selfAssessmentLevel: DEFAULT_SELF_ASSESSMENT,
    goals: [],
  });
}

export async function mockSignOut(): Promise<void> {
  await delay(null, 80);
}
