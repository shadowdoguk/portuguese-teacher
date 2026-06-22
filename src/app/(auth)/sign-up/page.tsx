"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/useAuth";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("Name, email, and a 6+ character password are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signUp({ name, email, password });
      router.push("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <span className="stage-stamp">Sign up</span>
      <h1 className="mt-3 text-display-md font-display font-light text-pretty">
        Begin where you are.
      </h1>
      <p className="mt-3 text-pretty text-ink-soft">
        Five minutes a day is the contract. The rest takes care of itself.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Name" name="name" autoComplete="name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="Six characters or more."
        />

        {error ? (
          <p role="alert" className="text-sm text-terracotta-deep">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-mute">
        Already learning with us?{" "}
        <Link href="/log-in" className="text-ink underline decoration-terracotta underline-offset-4">
          Log in
        </Link>
        .
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  hint,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="stage-stamp block pb-1.5">{label}</span>
      <input
        name={name}
        type={type}
        required
        {...rest}
        className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-mute/60 focus:border-terracotta focus:outline-none"
      />
      {hint ? <span className="mt-1 block text-xs text-ink-mute">{hint}</span> : null}
    </label>
  );
}