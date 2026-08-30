import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs on every request. Its ONLY job is to keep the Supabase session cookie
 * fresh (refresh the access token when it has expired and write the new cookies
 * onto the response).
 *
 * It deliberately does NOT redirect. Next strips the `rsc` / `next-router-*`
 * headers before middleware runs, so the proxy can't tell a soft (client-side)
 * navigation from a full one — and a redirect issued here on a soft navigation's
 * RSC request makes the App Router fall back to a full-page reload. Auth gating
 * lives in `requireUser()` / `requireAnon()`, called from the pages, where a
 * Server Component `redirect()` is handled by the router without a reload.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSession() is local: it only hits the network when the token is actually
  // expired (then it refreshes and setAll persists the new cookies). Signature
  // verification isn't needed here — requireUser() does the verified check.
  try {
    await supabase.auth.getSession();
  } catch {
    // Never let a transient auth error out of the proxy — it would turn the
    // navigation's RSC request into a non-OK response (→ full reload).
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * All paths except:
     * - _next/static, _next/image, favicon
     * - api/cron (secret-authenticated cron endpoint)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/cron).*)",
  ],
};
