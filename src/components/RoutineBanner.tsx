"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoutineBlock } from "@/lib/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function hhmm(t: string): string {
  return t.slice(0, 5);
}

type View =
  | { kind: "now"; block: RoutineBlock }
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
      return { kind: "now", block: b };
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
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const view = useMemo(
    () => (now ? computeView(blocks, now) : null),
    [blocks, now],
  );

  // Best-effort browser notification at a block's start time, while the tab is open.
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

  let text = "Nothing scheduled for the rest of today.";
  if (view?.kind === "now") {
    text = `Now: ${view.block.label} (${hhmm(view.block.start_time)}–${hhmm(
      view.block.end_time,
    )})`;
  } else if (view?.kind === "next") {
    text = `Next: ${view.block.label} at ${view.at}`;
  }

  return (
    <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            view?.kind === "now" ? "font-medium" : "text-[var(--muted)]"
          }
        >
          {view ? text : " "}
        </span>
        {typeof window !== "undefined" &&
          "Notification" in window &&
          !notify && (
            <button
              type="button"
              onClick={enableNotifications}
              className="shrink-0 text-xs text-[var(--muted)] underline hover:text-[var(--fg)]"
            >
              Enable reminders
            </button>
          )}
        {notify && (
          <span className="shrink-0 text-xs text-[var(--muted)]">
            Reminders on
          </span>
        )}
      </div>
    </div>
  );
}

export { DOW };
