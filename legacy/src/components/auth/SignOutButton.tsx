"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { useAuth } from "@/lib/auth/useAuth";

export type SignOutButtonProps = {
  /** Visual treatment. `ghost` matches the in-content ghost button; `link` is a quiet inline link. */
  variant?: "ghost" | "link";
  /** Optional extra class names. */
  className?: string;
  /** Optional callback after a successful sign-out completes. */
  onSignedOut?: () => void;
};

/**
 * UI affordance for `AuthProvider.signOut`. Wires the existing
 * `clearAuthCookie` + localStorage-removal path (called inside
 * `signOut` → `persist(null)`) and navigates to `/` afterwards.
 *
 * Issue #111: previously `signOut` was defined but never wired to any
 * component, leaving Learners unable to end their session via the UI.
 */
export function SignOutButton({ variant = "ghost", className, onSignedOut }: SignOutButtonProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await signOut();
      onSignedOut?.();
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  const baseClass =
    variant === "link"
      ? "text-sm text-ink-soft underline decoration-terracotta underline-offset-4 hover:text-ink"
      : "btn-ghost text-sm";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      aria-label="Sign out"
      data-testid="sign-out"
      className={className ? `${baseClass} ${className}` : baseClass}
    >
      {submitting ? "Signing out…" : "Sign out"}
    </button>
  );
}