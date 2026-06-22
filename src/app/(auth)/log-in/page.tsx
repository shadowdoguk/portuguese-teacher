"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/useAuth";

export default function LogInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <span className="stage-stamp">Log in</span>
      <h1 className="mt-3 text-display-md font-display font-light text-pretty">
        Welcome back.
      </h1>
      <p className="mt-3 text-pretty text-ink-soft">
        Pick up the streak. Your review queue is waiting.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <label className="block">
          <span className="stage-stamp block pb-1.5">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-mute/60 focus:border-terracotta focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="stage-stamp block pb-1.5">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-mute/60 focus:border-terracotta focus:outline-none"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-terracotta-deep">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-mute">
        New here?{" "}
        <Link href="/sign-up" className="text-ink underline decoration-terracotta underline-offset-4">
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}