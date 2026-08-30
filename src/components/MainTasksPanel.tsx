"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMainTask,
  deleteMainTask,
  deletePhaseItem,
  setMainTaskTopics,
} from "@/app/actions/mainTasks";
import { formatShort } from "@/lib/dates";
import { PHASES, PHASE_LABEL, PHASE_SHORT } from "@/lib/phases";
import type { MainTaskRow } from "@/lib/types";
import { ChevronIcon, PlusIcon, TrashIcon } from "@/components/icons";

type TopicOption = { id: string; name: string; mainTaskId: string | null };

function PhaseTrack({ current }: { current: string }) {
  const idx = PHASES.indexOf(current as (typeof PHASES)[number]);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {PHASES.map((p, i) => (
        <span
          key={p}
          className={
            "rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold " +
            (i < idx
              ? "text-[var(--fg-subtle)] line-through"
              : i === idx
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--fg-subtle)]")
          }
        >
          {PHASE_SHORT[p]}
        </span>
      ))}
    </div>
  );
}

function TopicPicker({
  options,
  selected,
  onToggle,
}: {
  options: TopicOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
      {options.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-2 py-1 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.has(o.id)}
            onChange={() => onToggle(o.id)}
            className="accent-[var(--accent)]"
          />
          <span>{o.name}</span>
          {o.mainTaskId && !selected.has(o.id) && (
            <span className="chip">in another</span>
          )}
        </label>
      ))}
    </div>
  );
}

export function MainTasksPanel({
  rows,
  topicOptions,
}: {
  rows: MainTaskRow[];
  topicOptions: TopicOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [openHistory, setOpenHistory] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // create-form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [newTopics, setNewTopics] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const res = await createMainTask({
        name,
        subject,
        existingTopicIds: [...picked],
        newTopicNames: newTopics
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (res.ok) {
        setName("");
        setSubject("");
        setPicked(new Set());
        setNewTopics("");
        setCreating(false);
      }
      return res;
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-[var(--fg-muted)]">
          Main tasks
        </h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="btn btn-secondary btn-sm"
        >
          <PlusIcon width={14} height={14} />
          New
        </button>
      </div>

      {error && <p className="mb-3 px-1 text-sm text-[var(--fail)]">{error}</p>}

      {creating && (
        <form onSubmit={submitCreate} className="card mb-3 flex flex-col gap-3 p-4">
          <div>
            <label className="field-label" htmlFor="mt-name">
              Name
            </label>
            <input
              id="mt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Liberation War"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="mt-subject">
              Subject <span className="text-[var(--fg-subtle)]">(optional)</span>
            </label>
            <input
              id="mt-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="e.g. Bangladesh Affairs"
            />
          </div>
          <div>
            <span className="field-label">Bundle existing topics</span>
            <TopicPicker
              options={topicOptions}
              selected={picked}
              onToggle={(id) =>
                setPicked((p) => {
                  const n = new Set(p);
                  n.has(id) ? n.delete(id) : n.add(id);
                  return n;
                })
              }
            />
          </div>
          <div>
            <label className="field-label" htmlFor="mt-new">
              New topics{" "}
              <span className="text-[var(--fg-subtle)]">(one per line)</span>
            </label>
            <textarea
              id="mt-new"
              value={newTopics}
              onChange={(e) => setNewTopics(e.target.value)}
              className="input min-h-20"
              placeholder={"Phase 1: 1947–1970\nPhase 2: 1971\nAftermath"}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary self-start"
          >
            {pending ? "Creating…" : "Create main task"}
          </button>
        </form>
      )}

      {rows.length === 0 && !creating ? (
        <div className="card px-5 py-8 text-center text-sm text-[var(--fg-muted)]">
          No main tasks. Bundle related topics into a flow: Skim → Notes → Exam →
          Recall.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const histOpen = openHistory.has(row.id);
            const isEditing = editing === row.id;
            return (
              <div key={row.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{row.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {row.subject && (
                        <span className="chip">{row.subject}</span>
                      )}
                      {row.phase === "recall" && (
                        <span className="chip">R{row.rung}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete main task “${row.name}”? Its topics stay; scheduled phases are removed.`,
                        )
                      )
                        run(() => deleteMainTask(row.id));
                    }}
                    disabled={pending}
                    aria-label={`Delete ${row.name}`}
                    className="btn btn-ghost btn-sm hover:text-[var(--fail)]"
                  >
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>

                <div className="mt-3">
                  <PhaseTrack current={row.phase} />
                </div>

                <p className="mt-3 text-sm text-[var(--fg-muted)]">
                  {row.pendingItem ? (
                    <>
                      {PHASE_LABEL[row.pendingItem.phase]} scheduled for{" "}
                      {formatShort(row.pendingItem.scheduledDate)}
                      <button
                        type="button"
                        onClick={() =>
                          run(() => deletePhaseItem(row.pendingItem!.id))
                        }
                        disabled={pending}
                        className="ml-2 text-[var(--fail)] underline"
                      >
                        unschedule
                      </button>
                    </>
                  ) : (
                    <>
                      No phase scheduled — do it on{" "}
                      <span className="text-[var(--fg)]">Add</span>.
                    </>
                  )}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {row.topicNames.length === 0 ? (
                    <span className="text-sm text-[var(--fg-subtle)]">
                      No topics bundled.
                    </span>
                  ) : (
                    row.topicNames.map((n) => (
                      <span key={n} className="chip">
                        {n}
                      </span>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((c) => (c === row.id ? null : row.id))
                    }
                    className="text-xs text-[var(--accent)] underline"
                  >
                    {isEditing ? "close" : "edit topics"}
                  </button>
                </div>

                {isEditing && (
                  <EditTopics
                    row={row}
                    options={topicOptions}
                    pending={pending}
                    onSave={(ids) =>
                      run(async () => {
                        const res = await setMainTaskTopics(row.id, ids);
                        if (res.ok) setEditing(null);
                        return res;
                      })
                    }
                  />
                )}

                {row.history.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenHistory((p) => {
                          const n = new Set(p);
                          n.has(row.id) ? n.delete(row.id) : n.add(row.id);
                          return n;
                        })
                      }
                      className="flex items-center gap-1 text-xs text-[var(--fg-muted)]"
                    >
                      <ChevronIcon
                        width={13}
                        height={13}
                        className={histOpen ? "" : "-rotate-90"}
                      />
                      {row.history.length} completed
                    </button>
                    {histOpen && (
                      <ul className="mt-1 divide-y divide-[var(--border)] text-sm">
                        {row.history.map((h) => (
                          <li
                            key={h.id}
                            className="flex items-center gap-2 py-1.5"
                          >
                            <span className="chip">{PHASE_SHORT[h.phase]}</span>
                            <span>{formatShort(h.scheduledDate)}</span>
                            {h.grade && (
                              <span className="chip capitalize">{h.grade}</span>
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
      )}
    </section>
  );
}

function EditTopics({
  row,
  options,
  pending,
  onSave,
}: {
  row: MainTaskRow;
  options: TopicOption[];
  pending: boolean;
  onSave: (ids: string[]) => void;
}) {
  const initial = new Set(
    options.filter((o) => row.topicNames.includes(o.name)).map((o) => o.id),
  );
  const [sel, setSel] = useState<Set<string>>(initial);
  return (
    <div className="mt-2 flex flex-col gap-2">
      <TopicPicker
        options={options}
        selected={sel}
        onToggle={(id) =>
          setSel((p) => {
            const n = new Set(p);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
          })
        }
      />
      <button
        type="button"
        onClick={() => onSave([...sel])}
        disabled={pending}
        className="btn btn-primary btn-sm self-start"
      >
        Save topics
      </button>
    </div>
  );
}
