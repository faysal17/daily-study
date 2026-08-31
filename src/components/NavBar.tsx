import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { SunIcon, ListIcon, ClockIcon } from "@/components/icons";

type Tab = "today" | "tasks" | "routine";

const TABS: { key: Tab; href: string; label: string; Icon: typeof SunIcon }[] = [
  { key: "today", href: "/", label: "Today", Icon: SunIcon },
  { key: "tasks", href: "/tasks", label: "Plan", Icon: ListIcon },
  { key: "routine", href: "/routine", label: "Routine", Icon: ClockIcon },
];

export function NavBar({ active }: { active: Tab }) {
  return (
    <header className="sticky top-0 z-20 -mx-[1.1rem] mb-5 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-[1.1rem] backdrop-blur">
      <div className="mx-auto flex max-w-[40rem] items-center justify-between py-3">
        <span className="text-[0.95rem] font-semibold tracking-tight">
          Study Tracker
        </span>
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost btn-sm">
            Sign out
          </button>
        </form>
      </div>

      <nav className="mx-auto flex max-w-[40rem] gap-1 overflow-x-auto pb-2">
        {TABS.map(({ key, href, label, Icon }) => {
          const on = key === active;
          return (
            <Link
              key={key}
              href={href}
              prefetch
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (on
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[color-mix(in_srgb,var(--fg)_7%,transparent)] hover:text-[var(--fg)]")
              }
            >
              <Icon width={15} height={15} />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{subtitle}</p>
      )}
    </div>
  );
}
