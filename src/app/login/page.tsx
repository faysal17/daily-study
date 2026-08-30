"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Study Tracker</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Sign in to continue.
        </p>
      </div>

      <form action={formAction} className="card flex flex-col gap-4 p-5">
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="username"
            required
            className="input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="input"
          />
        </div>

        {state.error && (
          <p className="text-sm text-[var(--fail)]">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary w-full"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
