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
import type { Learner } from "./types";

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
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "portuguese-teacher:user";

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
      const user = JSON.parse(raw) as Learner;
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
      setState((current) => {
        if (current.status !== "authenticated") return current;
        const updated: Learner = { ...current.user, dialect };
        persist(updated);
        return { status: "authenticated", user: updated };
      });
    },
    [persist],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.user,
      signIn,
      signUp,
      signOut,
      setDialect,
    }),
    [state, signIn, signUp, signOut, setDialect],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}