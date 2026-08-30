import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export function NavBar({ active }: { active: "today" | "add" | "routine" }) {
  const link = (href: string, key: string, label: string) => (
    <Link
      href={href}
      className={
        "px-3 py-1.5 rounded-md text-sm " +
        (active === key
          ? "bg-[var(--accent)] text-[var(--bg)]"
          : "text-[var(--muted)] hover:text-[var(--fg)]")
      }
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex items-center justify-between gap-2 py-4">
      <div className="flex items-center gap-1">
        {link("/", "today", "Today")}
        {link("/add", "add", "Add")}
        {link("/routine", "routine", "Routine")}
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="text-xs text-[var(--muted)] hover:text-[var(--fg)]"
        >
          Sign out
        </button>
      </form>
    </nav>
  );
}
