"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBlock, deleteBlock, updateBlock } from "@/app/actions/routine";
import type { ActionResult, RoutineBlock } from "@/lib/types";
import { TrashIcon } from "@/components/icons";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DayBoxes({ selected }: { selected: number[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DOW.map((d, i) => (
        <label
          key={i}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-2 py-1 text-xs has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-[var(--accent)]"
        >
          <input
            type="checkbox"
            name="days"
            value={i}
            defaultChecked={selected.includes(i)}
            className="sr-only"
          />
          {d}
        </label>
      ))}
    </div>
  );
}

export function RoutineEditor({ blocks }: { blocks: RoutineBlock[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(action: (fd: FormData) => Promise<ActionResult>, fd: FormData) {
    setErr(null);
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) setErr(res.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {err && <p className="text-sm text-[var(--fail)]">{err}</p>}

      {blocks.map((b) => (
        <form
          key={b.id}
          action={(fd) => run(updateBlock, fd)}
          className="card flex flex-col gap-3 p-4"
        >
          <input type="hidden" name="id" value={b.id} />
          <div className="flex items-center gap-2">
            <input
              name="label"
              defaultValue={b.label}
              className="input font-medium"
              required
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--fg-muted)]">
              <input
                type="checkbox"
                name="active"
                defaultChecked={b.active}
              />
              Active
            </label>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <input
              type="time"
              name="start_time"
              defaultValue={b.start_time.slice(0, 5)}
              className="input max-w-[7.5rem]"
              required
            />
            <span className="text-[var(--fg-subtle)]">to</span>
            <input
              type="time"
              name="end_time"
              defaultValue={b.end_time.slice(0, 5)}
              className="input max-w-[7.5rem]"
              required
            />
          </div>

          <DayBoxes selected={b.days_of_week ?? []} />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary btn-sm"
            >
              Save
            </button>
            <button
              type="submit"
              formAction={(fd) => run(deleteBlock, fd)}
              disabled={pending}
              className="btn btn-ghost btn-sm hover:text-[var(--fail)]"
            >
              <TrashIcon width={14} height={14} />
              Delete
            </button>
          </div>
        </form>
      ))}

      <form
        action={(fd) => run(createBlock, fd)}
        className="card flex flex-col gap-3 border-dashed p-4"
      >
        <p className="text-sm font-semibold">Add a block</p>
        <input
          name="label"
          placeholder="e.g. Morning deep study"
          className="input"
          required
        />
        <div className="flex items-center gap-2 text-sm">
          <input
            type="time"
            name="start_time"
            defaultValue="06:00"
            className="input max-w-[7.5rem]"
            required
          />
          <span className="text-[var(--fg-subtle)]">to</span>
          <input
            type="time"
            name="end_time"
            defaultValue="08:00"
            className="input max-w-[7.5rem]"
            required
          />
        </div>
        <DayBoxes selected={[0, 1, 2, 3, 4, 5, 6]} />
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-sm self-start"
        >
          Add block
        </button>
      </form>
    </div>
  );
}
