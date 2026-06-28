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
import type { Learner, LearnerGoal, Level } from "./types";
import { DEFAULT_NATIVE_LANGUAGE, DEFAULT_SELF_ASSESSMENT } from "./types";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: Learner };

export type AuthContextValue = {
  state: AuthState;
  user: Learner | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
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
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "portuguese-teacher:user";

function withDefaults(user: Learner): Learner {
  return {
    ...user,
    nativeLanguage: user.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE,
    selfAssessmentLevel: user.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT,
    goals: user.goals ?? [],
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
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
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
    async (input: { name: string; email: string; password: string }) => {
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
    }),
    [state, signIn, signUp, signOut, setDialect, updateProfile, setLevel, toggleGoal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
