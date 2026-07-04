"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockSignIn, mockSignOut, mockSignUp } from "./mockUsers";
import type { Learner, LearnerGoal, Level, PlacementAttemptRecord } from "./types";
import { DEFAULT_NATIVE_LANGUAGE, DEFAULT_SELF_ASSESSMENT } from "./types";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: Learner };

export type PlacementConfirmInput = {
  attemptId: string;
  attemptedAt: string;
  selfAssessedLevel: Exclude<Level, "A0">;
  overallScore: number;
  recommendedStartUnitId: string;
  recommendedStartLevel: Level;
  confirmedStartUnitId: string;
  confirmedStartLevel: Level;
  learnerAccepted: boolean;
};

export type AuthContextValue = {
  state: AuthState;
  user: Learner | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    input: {
      name: string;
      email: string;
      password: string;
      selfAssessmentLevel?: Level;
    },
  ) => Promise<void>;
  signOut: () => Promise<void>;
  setDialect: (dialect: Learner["dialect"]) => void;
  updateProfile: (
    patch: Partial<
      Pick<
        Learner,
        | "name"
        | "nativeLanguage"
        | "selfAssessmentLevel"
        | "goals"
        | "currentUnitId"
      >
    >,
  ) => void;
  setLevel: (level: Level) => void;
  toggleGoal: (goal: LearnerGoal) => void;
  setCurrentUnit: (unitId: string) => void;
  confirmPlacement: (input: PlacementConfirmInput) => void;
  latestPlacementAttempt: () => PlacementAttemptRecord | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "portuguese-teacher:user";
const COOKIE_KEY = "portuguese-teacher:auth";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

/**
 * Mirrors the Learner ID into a short-lived cookie so the edge middleware
 * can gate protected routes. The cookie value is the ID only — no PII.
 * Issue #133.
 */
function writeAuthCookie(learnerId: string): void {
  if (typeof document === "undefined") return;
  document.cookie =
    `${COOKIE_KEY}=${encodeURIComponent(learnerId)}; ` +
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=; Max-Age=0; Path=/`;
}

function withDefaults(user: Learner): Learner {
  return {
    ...user,
    nativeLanguage: user.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE,
    selfAssessmentLevel: user.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT,
    goals: user.goals ?? [],
    placementAttempts: user.placementAttempts ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setState({ status: "anonymous", user: null });
      return;
    }
    try {
      const user = withDefaults(JSON.parse(raw) as Learner);
      setState({ status: "authenticated", user });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setState({ status: "anonymous", user: null });
    }
  }, []);

  const persist = useCallback((user: Learner | null) => {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      // Mirror the Learner ID into a short-lived cookie so the edge
      // middleware (src/middleware.ts) can gate protected routes
      // without a server-side session lookup on every request.
      // The cookie carries the ID only — no sensitive data.
      // Issue #133.
      writeAuthCookie(user.id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      clearAuthCookie();
    }
  }, []);

  const mutate = useCallback(
    (updater: (current: Learner) => Learner) => {
      setState((current) => {
        if (current.status !== "authenticated") return current;
        const updated = withDefaults(updater(current.user));
        persist(updated);
        return { status: "authenticated", user: updated };
      });
    },
    [persist],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const user = await mockSignIn(email, password);
      persist(user);
      setState({ status: "authenticated", user });
    },
    [persist],
  );

  const signUp = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      selfAssessmentLevel?: Level;
    }) => {
      const user = await mockSignUp(input);
      persist(user);
      setState({ status: "authenticated", user });
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    await mockSignOut();
    persist(null);
    setState({ status: "anonymous", user: null });
  }, [persist]);

  const setDialect = useCallback(
    (dialect: Learner["dialect"]) => {
      mutate((current) => ({ ...current, dialect }));
    },
    [mutate],
  );

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(
    (patch) => {
      mutate((current) => ({ ...current, ...patch }));
    },
    [mutate],
  );

  const setLevel = useCallback<AuthContextValue["setLevel"]>(
    (level) => {
      mutate((current) => ({ ...current, level }));
    },
    [mutate],
  );

  const toggleGoal = useCallback<AuthContextValue["toggleGoal"]>(
    (goal) => {
      mutate((current) => {
        const goals = current.goals ?? [];
        const next = goals.includes(goal)
          ? goals.filter((g) => g !== goal)
          : [...goals, goal];
        return { ...current, goals: next };
      });
    },
    [mutate],
  );

  const setCurrentUnit = useCallback<AuthContextValue["setCurrentUnit"]>(
    (unitId) => {
      mutate((current) => ({ ...current, currentUnitId: unitId }));
    },
    [mutate],
  );

  const confirmPlacement = useCallback<AuthContextValue["confirmPlacement"]>(
    (input) => {
      const record: PlacementAttemptRecord = {
        id: input.attemptId,
        attemptedAt: input.attemptedAt,
        selfAssessedLevel: input.selfAssessedLevel,
        overallScore: input.overallScore,
        recommendedStartUnitId: input.recommendedStartUnitId,
        recommendedStartLevel: input.recommendedStartLevel,
        confirmedStartUnitId: input.confirmedStartUnitId,
        confirmedStartLevel: input.confirmedStartLevel,
        learnerAccepted: input.learnerAccepted,
      };
      mutate((current) => {
        const prior = current.placementAttempts ?? [];
        return {
          ...current,
          currentUnitId: input.confirmedStartUnitId,
          level: input.confirmedStartLevel,
          selfAssessmentLevel: input.selfAssessedLevel,
          placementAttempts: [...prior, record],
        };
      });
    },
    [mutate],
  );

  const latestPlacementAttempt = useCallback<
    AuthContextValue["latestPlacementAttempt"]
  >(() => {
    if (state.status !== "authenticated") return null;
    const attempts = state.user.placementAttempts ?? [];
    return attempts.length === 0 ? null : attempts[attempts.length - 1] ?? null;
  }, [state]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.user,
      signIn,
      signUp,
      signOut,
      setDialect,
      updateProfile,
      setLevel,
      toggleGoal,
      setCurrentUnit,
      confirmPlacement,
      latestPlacementAttempt,
    }),
    [
      state,
      signIn,
      signUp,
      signOut,
      setDialect,
      updateProfile,
      setLevel,
      toggleGoal,
      setCurrentUnit,
      confirmPlacement,
      latestPlacementAttempt,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
