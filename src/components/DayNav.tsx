import Link from "next/link";
import { addDaysISO } from "@/lib/dates";
import { ChevronIcon } from "@/components/icons";

/**
 * Previous / next day stepper for the Today screen. Each arrow is a plain link
 * to `/?d=YYYY-MM-DD` (or `/` for today), so day switching is a normal
 * server-rendered navigation. The viewed date itself is already shown in the
 * page header, so it isn't repeated here — the middle slot only holds the
 * "Back to today" button when you've stepped away from today.
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

      {date !== today && (
        <Link href="/" prefetch className="btn btn-secondary btn-sm">
          Back to today
        </Link>
      )}

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
