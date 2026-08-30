"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <main className="container-narrow flex min-h-dvh flex-col justify-center pb-24">
      <h1 className="text-xl font-semibold">Study Tracker</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">Sign in to continue.</p>

      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          />
        </label>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-[var(--bg)] disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
