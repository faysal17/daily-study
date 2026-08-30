"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoutineBlock } from "@/lib/types";
import { ClockIcon } from "@/components/icons";

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function hhmm(t: string): string {
  return t.slice(0, 5);
}

type View =
  | { kind: "now"; block: RoutineBlock; endsIn: number }
  | { kind: "next"; block: RoutineBlock; at: string }
  | { kind: "idle" };

function computeView(blocks: RoutineBlock[], now: Date): View {
  const dow = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const todays = blocks
    .filter((b) => b.active && b.days_of_week?.includes(dow))
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  for (const b of todays) {
    if (mins >= toMinutes(b.start_time) && mins < toMinutes(b.end_time)) {
      return { kind: "now", block: b, endsIn: toMinutes(b.end_time) - mins };
    }
  }
  const upcoming = todays.find((b) => toMinutes(b.start_time) > mins);
  if (upcoming) {
    return { kind: "next", block: upcoming, at: hhmm(upcoming.start_time) };
  }
  return { kind: "idle" };
}

export function RoutineBanner({ blocks }: { blocks: RoutineBlock[] }) {
  const [now, setNow] = useState<Date | null>(null);
  const [notify, setNotify] = useState(false);
  const [canNotify, setCanNotify] = useState(false);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNow(new Date());
    setCanNotify("Notification" in window);
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const view = useMemo(
    () => (now ? computeView(blocks, now) : null),
    [blocks, now],
  );

  useEffect(() => {
    if (!notify || !now || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const dow = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const b of blocks) {
      if (!b.active || !b.days_of_week?.includes(dow)) continue;
      const start = toMinutes(b.start_time);
      const key = `${now.toDateString()}#${b.id}`;
      if (mins >= start && mins <= start + 1 && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        new Notification("Study block", {
          body: `${b.label} — ${hhmm(b.start_time)}–${hhmm(b.end_time)}`,
        });
      }
    }
  }, [notify, now, blocks]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const perm =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    setNotify(perm === "granted");
  }

  if (blocks.length === 0) return null;

  let primary = "Nothing scheduled for the rest of today.";
  let sub: string | null = null;
  let live = false;
  if (view?.kind === "now") {
    primary = view.block.label;
    sub = `Now · ends ${hhmm(view.block.end_time)} (${view.endsIn} min left)`;
    live = true;
  } else if (view?.kind === "next") {
    primary = view.block.label;
    sub = `Next · starts ${view.at}`;
  }

  return (
    <div
      className={
        "card mb-5 flex items-center gap-3 px-4 py-3 " +
        (live ? "border-[var(--accent)]" : "")
      }
    >
      <span
        className={
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg " +
          (live
            ? "bg-[var(--accent)] text-[var(--accent-fg)]"
            : "bg-[var(--accent-soft)] text-[var(--accent)]")
        }
      >
        <ClockIcon width={17} height={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{primary}</p>
        {sub && (
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{sub}</p>
        )}
      </div>
      {canNotify &&
        (notify ? (
          <span className="chip">Reminders on</span>
        ) : (
          <button
            type="button"
            onClick={enableNotifications}
            className="btn btn-ghost btn-sm"
          >
            Remind me
          </button>
        ))}
    </div>
  );
}
