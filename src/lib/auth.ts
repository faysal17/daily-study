import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Use at the top of every protected page instead of `createClient()`.
 * The proxy keeps the session cookie fresh; this is the authoritative,
 * signature-verified check for the render. `redirect()` from a Server Component
 * is encoded in the Flight response, so the App Router handles it as a soft
 * navigation — no full-page reload (unlike a redirect issued from the proxy).
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

/** For the login page: bounce an already-signed-in user to the app. */
export async function requireAnon() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");
}
