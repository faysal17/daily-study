import Link from "next/link";
import { addDaysISO, formatShort } from "@/lib/dates";
import { ChevronIcon } from "@/components/icons";

/**
 * Previous / next day stepper for the Today screen. Each arrow is a plain link
 * to `/?d=YYYY-MM-DD` (or `/` for today), so day switching is a normal
 * server-rendered navigation.
 */
export function DayNav({ date, today }: { date: string; today: string }) {
  const hrefFor = (d: string) => (d === today ? "/" : `/?d=${d}`);

  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <Link
        href={hrefFor(addDaysISO(date, -1))}
        prefetch
        aria-label="Previous day"
        className="btn btn-secondary btn-sm"
      >
        <ChevronIcon width={16} height={16} className="rotate-90" />
      </Link>

      <div className="flex flex-col items-center leading-tight">
        <span className="text-sm font-medium">{formatShort(date)}</span>
        {date !== today && (
          <Link
            href="/"
            prefetch
            className="text-xs text-[var(--accent)] underline"
          >
            back to today
          </Link>
        )}
      </div>

      <Link
        href={hrefFor(addDaysISO(date, 1))}
        prefetch
        aria-label="Next day"
        className="btn btn-secondary btn-sm"
      >
        <ChevronIcon width={16} height={16} className="-rotate-90" />
      </Link>
    </div>
  );
}
