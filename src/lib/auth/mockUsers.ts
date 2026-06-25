import type { Level } from "@/lib/curriculum";
import type { Learner } from "./types";

const DEMO_USER: Learner = {
  id: "demo-learner-001",
  name: "Demo Learner",
  email: "demo@portugues.app",
  dialect: "pt-PT",
  level: "A0",
  streakDays: 4,
  weeklyMinutes: 95,
  createdAt: "2026-06-01T00:00:00.000Z",
};

function delay<T>(value: T, ms = 240): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function mockSignIn(email: string, _password: string): Promise<Learner> {
  return delay<Learner>({
    ...DEMO_USER,
    email: email.trim() || DEMO_USER.email,
  });
}

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  selfAssessedLevel?: Level;
  entryUnitId?: string;
  level?: Level;
};

export async function mockSignUp(input: SignUpInput): Promise<Learner> {
  const id = `learner-${Date.now()}`;
  const selfAssessedLevel =
    input.selfAssessedLevel && input.selfAssessedLevel !== "A0" ? input.selfAssessedLevel : undefined;
  return delay<Learner>({
    ...DEMO_USER,
    name: input.name.trim() || DEMO_USER.name,
    email: input.email.trim() || DEMO_USER.email,
    id,
    selfAssessedLevel,
    level: input.level ?? "A0",
    currentUnitId: input.entryUnitId,
    createdAt: new Date().toISOString(),
  });
}

export async function mockSignOut(): Promise<void> {
  await delay(null, 80);
}
