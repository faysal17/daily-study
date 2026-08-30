import { requireUser } from "@/lib/auth";

// Re-run on every navigation so an expired session is caught here (above the
// loading boundary) and redirected cleanly — not as a post-stream meta refresh.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
