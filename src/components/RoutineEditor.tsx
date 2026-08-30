"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBlock, deleteBlock, updateBlock } from "@/app/actions/routine";
import type { RoutineBlock } from "@/lib/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DayBoxes({ selected }: { selected: number[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {DOW.map((d, i) => (
        <label key={i} className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            name="days"
            value={i}
            defaultChecked={selected.includes(i)}
          />
          {d}
        </label>
      ))}
    </div>
  );
}

const inputCls =
  "rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm";

export function RoutineEditor({ blocks }: { blocks: RoutineBlock[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, fd: FormData) {
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) alert(res.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b) => (
        <form
          key={b.id}
          action={(fd) => run(updateBlock, fd)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
        >
          <input type="hidden" name="id" value={b.id} />
          <div className="flex flex-col gap-2">
            <input
              name="label"
              defaultValue={b.label}
              className={inputCls}
              required
            />
            <div className="flex items-center gap-2 text-sm">
              <input
                type="time"
                name="start_time"
                defaultValue={b.start_time.slice(0, 5)}
                className={inputCls}
                required
              />
              <span className="text-[var(--muted)]">to</span>
              <input
                type="time"
                name="end_time"
                defaultValue={b.end_time.slice(0, 5)}
                className={inputCls}
                required
              />
            </div>
            <DayBoxes selected={b.days_of_week ?? []} />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="active"
                defaultChecked={b.active}
              />
              Active
            </label>
            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs text-[var(--bg)] disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="submit"
                formAction={(fd) => run(deleteBlock, fd)}
                disabled={pending}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </form>
      ))}

      <form
        action={(fd) => run(createBlock, fd)}
        className="rounded-lg border border-dashed border-[var(--border)] p-3"
      >
        <p className="mb-2 text-sm font-medium">Add a block</p>
        <div className="flex flex-col gap-2">
          <input
            name="label"
            placeholder="e.g. Morning deep study"
            className={inputCls}
            required
          />
          <div className="flex items-center gap-2 text-sm">
            <input
              type="time"
              name="start_time"
              defaultValue="06:00"
              className={inputCls}
              required
            />
            <span className="text-[var(--muted)]">to</span>
            <input
              type="time"
              name="end_time"
              defaultValue="08:00"
              className={inputCls}
              required
            />
          </div>
          <DayBoxes selected={[0, 1, 2, 3, 4, 5, 6]} />
          <button
            type="submit"
            disabled={pending}
            className="mt-1 self-start rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs text-[var(--bg)] disabled:opacity-60"
          >
            Add block
          </button>
        </div>
      </form>
    </div>
  );
}
