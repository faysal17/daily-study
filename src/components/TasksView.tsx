"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteItem, deleteTopic } from "@/app/actions/study";
import { formatShort } from "@/lib/dates";
import type { TaskRow } from "@/lib/types";
import { ChevronIcon, TrashIcon } from "@/components/icons";
import { useConfirm } from "@/components/confirm";

type Filter = "all" | "active" | "done";

export function TasksView({ rows }: { rows: TaskRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    if (filter === "active") return rows.filter((r) => r.pendingCount > 0);
    if (filter === "done")
      return rows.filter((r) => r.pendingCount === 0 && r.doneCount > 0);
    return rows;
  }, [rows, filter]);

  function toggle(id: string) {
    setOpen((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function mark(id: string, on: boolean) {
    setBusy((cur) => {
      const next = new Set(cur);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function removeItem(id: string) {
    setError(null);
    mark(id, true);
    startTransition(async () => {
      const res = await deleteItem(id);
      if (!res.ok) setError(res.error ?? "Could not delete.");
      mark(id, false);
      router.refresh();
    });
  }

  async function removeTopic(row: TaskRow) {
    const ok = await confirm({
      title: `Delete “${row.topicName}”?`,
      message: `Removes the topic and all ${
        row.pendingCount + row.doneCount
      } of its items. This can't be undone.`,
      confirmLabel: "Delete topic",
    });
    if (!ok) return;
    setError(null);
    mark(row.topicId, true);
    startTransition(async () => {
      const res = await deleteTopic(row.topicId);
      if (!res.ok) setError(res.error ?? "Could not delete.");
      mark(row.topicId, false);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="card px-5 py-10 text-center text-[var(--fg-muted)]">
        No topics yet. Add one on the Add screen.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex self-start rounded-lg border border-[var(--border-strong)] p-0.5 text-sm">
        {(["all", "active", "done"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "rounded-[7px] px-3 py-1.5 font-medium capitalize transition-colors " +
              (filter === f
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-[var(--fail)]">{error}</p>}

      {visible.map((row) => {
        const isOpen = open.has(row.topicId);
        const isBusy = busy.has(row.topicId);
        return (
          <div
            key={row.topicId}
            className={
              "card overflow-hidden transition-opacity " +
              (isBusy ? "opacity-50" : "")
            }
          >
            <div className="flex items-center gap-2 p-4">
              <button
                type="button"
                onClick={() => toggle(row.topicId)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ChevronIcon
                  width={16}
                  height={16}
                  className={
                    "shrink-0 text-[var(--fg-subtle)] transition-transform " +
                    (isOpen ? "rotate-0" : "-rotate-90")
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {row.topicName}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {row.subject && <span className="chip">{row.subject}</span>}
                    {row.mainTaskName && (
                      <span className="chip text-[var(--accent)]">
                        {row.mainTaskName}
                      </span>
                    )}
                    {row.currentRung !== null && (
                      <span className="chip">R{row.currentRung}</span>
                    )}
                    <span className="chip">
                      {row.pendingCount} scheduled · {row.doneCount} done
                    </span>
                    {row.nextDate && (
                      <span className="chip">
                        next {formatShort(row.nextDate)}
                      </span>
                    )}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeTopic(row)}
                disabled={isBusy}
                aria-label={`Delete ${row.topicName}`}
                className="btn btn-ghost btn-sm hover:text-[var(--fail)]"
              >
                <TrashIcon width={15} height={15} />
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--fg)_3%,transparent)] px-4 py-2">
                {row.items.length === 0 ? (
                  <p className="py-2 text-sm text-[var(--fg-subtle)]">
                    No items.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {row.items.map((it) => (
                      <li
                        key={it.id}
                        className={
                          "flex items-center gap-2 py-2.5 " +
                          (busy.has(it.id) ? "opacity-50" : "")
                        }
                      >
                        <span
                          className={
                            "h-1.5 w-1.5 shrink-0 rounded-full " +
                            (it.status === "pending"
                              ? "bg-[var(--accent)]"
                              : "bg-[var(--fg-subtle)]")
                          }
                        />
                        <span className="w-24 shrink-0 text-sm">
                          {formatShort(it.scheduledDate)}
                        </span>
                        <span className="flex flex-1 flex-wrap items-center gap-1.5">
                          <span className="chip">R{it.rung}</span>
                          <span className="chip capitalize">{it.status}</span>
                          {it.grade && (
                            <span className="chip capitalize">{it.grade}</span>
                          )}
                          {it.routineLabel && (
                            <span className="chip">{it.routineLabel}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          disabled={busy.has(it.id)}
                          aria-label="Delete item"
                          className="btn btn-ghost btn-sm hover:text-[var(--fail)]"
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
