"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LEVELS, type Level } from "@/lib/curriculum";
import { entryUnit, indexCurriculum } from "@/lib/curriculum";
import { A0_CURRICULUM } from "@/lib/curriculum";
import { requiresPlacement } from "@/lib/placement";
import { useAuth } from "@/lib/auth/useAuth";

const SELF_ASSESS_LABELS: Record<Level, string> = {
  A0: "A0 · Absolute beginner — start with the alphabet",
  A1: "A1 · I can handle greetings and simple questions",
  A2: "A2 · I can manage everyday situations",
  B1: "B1 · I can hold a conversation but want to refine it",
};

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfAssessment, setSelfAssessment] = useState<Level>("A0");

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
      const index = indexCurriculum(A0_CURRICULUM);
      const entry = entryUnit(index);
      const user = await signUp(
        { name, email, password },
        requiresPlacement(selfAssessment)
          ? { selfAssessedLevel: selfAssessment }
          : { selfAssessedLevel: undefined, entryUnitId: entry.id, level: "A0" },
      );
      router.push(user.currentUnitId ? "/dashboard" : "/placement");
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

        <fieldset className="space-y-2">
          <legend className="stage-stamp block pb-1.5">Where are you in Portuguese?</legend>
          <p className="text-xs text-ink-mute">
            Above A0 starts with a single Placement Lesson that confirms or revises your
            starting Unit. A0 skips it and goes straight to Unit 1.
          </p>
          <div className="space-y-2">
            {LEVELS.map((level) => (
              <label
                key={level}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-sm hover:border-terracotta"
              >
                <input
                  type="radio"
                  name="selfAssessedLevel"
                  value={level}
                  checked={selfAssessment === level}
                  onChange={() => setSelfAssessment(level)}
                  className="mt-1 accent-terracotta"
                />
                <span className="text-ink">{SELF_ASSESS_LABELS[level]}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
