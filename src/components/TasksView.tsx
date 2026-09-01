"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignTopic,
  deleteItem,
  deleteTopic,
  rescheduleStudyItem,
} from "@/app/actions/study";
import { formatShort } from "@/lib/dates";
import { PHASE_SHORT } from "@/lib/phases";
import type { TaskRow } from "@/lib/types";
import { ChevronIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useConfirm } from "@/components/confirm";
import { DateBlockFields, type BlockOption } from "@/components/DateBlockFields";
import { SubjectField } from "@/components/SubjectField";

type Filter = "all" | "active" | "done";

export function TasksView({
  rows,
  blocks,
  subjects,
  today,
}: {
  rows: TaskRow[];
  blocks: BlockOption[];
  subjects: string[];
  today: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>("all");
  const [showBundled, setShowBundled] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // create-a-topic form
  const [creating, setCreating] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState(today);
  const [newBlockId, setNewBlockId] = useState("");

  const bundledCount = useMemo(
    () => rows.filter((r) => r.mainTaskName).length,
    [rows],
  );

  const visible = useMemo(() => {
    const base = showBundled ? rows : rows.filter((r) => !r.mainTaskName);
    if (filter === "active") return base.filter((r) => r.pendingCount > 0);
    if (filter === "done")
      return base.filter((r) => r.pendingCount === 0 && r.doneCount > 0);
    return base;
  }, [rows, filter, showBundled]);

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

  function scheduleTopic(row: TaskRow, date: string, blockId: string) {
    setError(null);
    mark(row.topicId, true);
    startTransition(async () => {
      const res = await assignTopic({
        topicId: row.topicId,
        date,
        routineBlockId: blockId || undefined,
      });
      if (!res.ok) setError(res.error ?? "Could not schedule.");
      else setScheduling(null);
      mark(row.topicId, false);
      router.refresh();
    });
  }

  function moveItem(itemId: string, date: string, blockId: string) {
    setError(null);
    mark(itemId, true);
    startTransition(async () => {
      const res = await rescheduleStudyItem({
        itemId,
        date,
        routineBlockId: blockId || undefined,
      });
      if (!res.ok) setError(res.error ?? "Could not reschedule.");
      else setRescheduling(null);
      mark(itemId, false);
      router.refresh();
    });
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) return;
    setSavingNew(true);
    startTransition(async () => {
      const res = await assignTopic({
        newTopicName: name,
        subject: newSubject.trim() || undefined,
        date: newDate,
        routineBlockId: newBlockId || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not add topic.");
      } else {
        setNewName("");
        setNewSubject("");
        setNewBlockId("");
        setNewDate(today);
        setCreating(false);
      }
      setSavingNew(false);
      router.refresh();
    });
  }

  const emptyMessage =
    rows.length === 0
      ? "No topics yet. Create one with “New topic”."
      : !showBundled && bundledCount > 0
        ? "No standalone topics. Tick “Show in main tasks” to see the rest."
        : "Nothing matches this filter.";

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-[var(--fg-muted)]">Topics</h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn btn-secondary btn-sm"
        >
          <PlusIcon width={14} height={14} />
          New topic
        </button>
      </div>

      {error && <p className="px-1 text-sm text-[var(--fail)]">{error}</p>}

      {creating && (
        <form onSubmit={submitCreate} className="card flex flex-col gap-3 p-4">
          <div>
            <label className="field-label" htmlFor="new-topic-name">
              Topic name
            </label>
            <input
              id="new-topic-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input"
              placeholder="e.g. Liberation War — phases"
              required
            />
          </div>
          <SubjectField
            value={newSubject}
            onChange={setNewSubject}
            subjects={subjects}
          />
          <DateBlockFields
            date={newDate}
            onDateChange={setNewDate}
            blockId={newBlockId}
            onBlockChange={setNewBlockId}
            blocks={blocks}
          />
          <button
            type="submit"
            disabled={savingNew}
            className="btn btn-primary self-start"
          >
            {savingNew ? "Adding…" : "Add topic"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
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
        {bundledCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
            <input
              type="checkbox"
              checked={showBundled}
              onChange={(e) => setShowBundled(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Show {bundledCount} in main tasks
          </label>
        )}
      </div>

      {visible.length === 0 && (
        <div className="card px-5 py-10 text-center text-sm text-[var(--fg-muted)]">
          {emptyMessage}
        </div>
      )}

      {visible.map((row) => {
        const isOpen = open.has(row.topicId);
        const isBusy = busy.has(row.topicId);
        const isScheduling = scheduling === row.topicId;
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
                    <span className="chip text-[var(--accent)]">
                      {PHASE_SHORT[row.phase]}
                    </span>
                    {row.subject && <span className="chip">{row.subject}</span>}
                    {row.mainTaskName && (
                      <span className="chip text-[var(--accent)]">
                        {row.mainTaskName}
                      </span>
                    )}
                    {row.phase === "recall" && row.currentRung !== null && (
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
              {row.pendingCount === 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setScheduling((c) =>
                      c === row.topicId ? null : row.topicId,
                    )
                  }
                  disabled={isBusy}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  {isScheduling ? "Close" : `Schedule ${PHASE_SHORT[row.phase]}`}
                </button>
              )}
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

            {isScheduling && (
              <div className="border-t border-[var(--border)] px-4 py-3">
                <InlineScheduler
                  initialDate={today}
                  initialBlockId=""
                  blocks={blocks}
                  pending={isBusy}
                  saveLabel="Schedule"
                  onSave={(date, blockId) => scheduleTopic(row, date, blockId)}
                  onCancel={() => setScheduling(null)}
                />
              </div>
            )}

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
                          "py-2.5 " + (busy.has(it.id) ? "opacity-50" : "")
                        }
                      >
                        <div className="flex items-center gap-2">
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
                            <span className="chip capitalize">{it.phase}</span>
                            {it.phase === "recall" && (
                              <span className="chip">R{it.rung}</span>
                            )}
                            <span className="chip capitalize">{it.status}</span>
                            {it.grade && (
                              <span className="chip capitalize">{it.grade}</span>
                            )}
                            {it.routineLabel && (
                              <span className="chip">{it.routineLabel}</span>
                            )}
                          </span>
                          {it.status === "pending" && (
                            <button
                              type="button"
                              onClick={() =>
                                setRescheduling((c) =>
                                  c === it.id ? null : it.id,
                                )
                              }
                              disabled={busy.has(it.id)}
                              className="btn btn-secondary btn-sm shrink-0"
                            >
                              {rescheduling === it.id ? "Close" : "Move"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeItem(it.id)}
                            disabled={busy.has(it.id)}
                            aria-label="Delete item"
                            className="btn btn-ghost btn-sm hover:text-[var(--fail)]"
                          >
                            <TrashIcon width={14} height={14} />
                          </button>
                        </div>
                        {rescheduling === it.id && (
                          <div className="mt-2">
                            <InlineScheduler
                              initialDate={it.scheduledDate}
                              initialBlockId={it.routineBlockId ?? ""}
                              blocks={blocks}
                              pending={busy.has(it.id)}
                              saveLabel="Move"
                              onSave={(date, blockId) =>
                                moveItem(it.id, date, blockId)
                              }
                              onCancel={() => setRescheduling(null)}
                            />
                          </div>
                        )}
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

/** Date + routine-block picker with Save / Cancel, used inline on a topic row. */
function InlineScheduler({
  initialDate,
  initialBlockId,
  blocks,
  pending,
  saveLabel,
  onSave,
  onCancel,
}: {
  initialDate: string;
  initialBlockId: string;
  blocks: BlockOption[];
  pending: boolean;
  saveLabel: string;
  onSave: (date: string, blockId: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [blockId, setBlockId] = useState(initialBlockId);
  return (
    <div className="flex flex-col gap-3">
      <DateBlockFields
        date={date}
        onDateChange={setDate}
        blockId={blockId}
        onBlockChange={setBlockId}
        blocks={blocks}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !date}
          onClick={() => onSave(date, blockId)}
          className="btn btn-primary btn-sm"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost btn-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
