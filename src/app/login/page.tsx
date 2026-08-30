import { requireAnon } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await requireAnon();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Study Tracker</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Sign in to continue.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
