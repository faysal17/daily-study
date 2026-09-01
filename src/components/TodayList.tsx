"use client";

import { useMemo, useState, useTransition } from "react";
import { gradeItem } from "@/app/actions/study";
import {
  completePhaseItem,
  togglePhaseTopic,
} from "@/app/actions/mainTasks";
import { GRADES, GRADE_LABEL, type Grade } from "@/lib/ladder";
import { PHASE_LABEL, phaseNeedsGrade } from "@/lib/phases";
import type { DuePhase, DueItem, TodayEntry, TodayGroup } from "@/lib/types";
import { CheckIcon } from "@/components/icons";

const GRADE_STYLE: Record<Grade, string> = {
  good: "hover:border-[var(--good)] hover:text-[var(--good)]",
  shaky: "hover:border-[var(--shaky)] hover:text-[var(--shaky)]",
  fail: "hover:border-[var(--fail)] hover:text-[var(--fail)]",
};

function GradeRow({ onPick }: { onPick: (g: Grade) => void }) {
  return (
    <div className="mt-3 flex gap-2">
      {GRADES.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onPick(g)}
          className={"btn btn-secondary btn-sm flex-1 " + GRADE_STYLE[g]}
        >
          {GRADE_LABEL[g]}
        </button>
      ))}
    </div>
  );
}

export function TodayList({
  groups: initialGroups,
  isToday = true,
  hasRoutine,
}: {
  groups: TodayGroup[];
  isToday?: boolean;
  hasRoutine: boolean;
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const groups = useMemo(
    () =>
      initialGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => !removed.has(i.id)) }))
        .filter((g) => g.timeRange !== null || g.items.length > 0),
    [initialGroups, removed],
  );

  const totalLeft = groups.reduce((n, g) => n + g.items.length, 0);

  function drop(id: string) {
    setOpenId(null);
    setRemoved((p) => new Set(p).add(id));
  }
  function undrop(id: string) {
    setRemoved((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
  }

  function gradeTopic(item: DueItem, g: Grade | null) {
    setError(null);
    drop(item.id);
    startTransition(async () => {
      const res = await gradeItem(item.id, g);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        undrop(item.id);
      }
    });
  }

  function finishPhase(phase: DuePhase, g?: Grade) {
    setError(null);
    drop(phase.id);
    startTransition(async () => {
      const res = await completePhaseItem(phase.id, g);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        undrop(phase.id);
      }
    });
  }

  function checkedFor(phase: DuePhase): Set<string> {
    return checks[phase.id] ?? new Set(phase.checkedTopicIds);
  }

  function toggleTopic(phase: DuePhase, topicId: string) {
    const cur = new Set(checkedFor(phase));
    const willCheck = !cur.has(topicId);
    willCheck ? cur.add(topicId) : cur.delete(topicId);
    setChecks((p) => ({ ...p, [phase.id]: cur }));
    startTransition(async () => {
      await togglePhaseTopic(phase.id, topicId, willCheck);
    });
  }

  if (totalLeft === 0 && !hasRoutine) {
    return (
      <div className="card mt-2 px-5 py-10 text-center">
        <p className="text-[var(--fg-muted)]">
          {isToday
            ? "Nothing due. You're clear."
            : "Nothing scheduled for this day."}
        </p>
        {error && <p className="mt-3 text-sm text-[var(--fail)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-5">
      {error && <p className="text-sm text-[var(--fail)]">{error}</p>}

      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-baseline gap-2 px-1">
            <h2 className="text-sm font-semibold">{group.label}</h2>
            {group.timeRange && (
              <span className="text-xs font-medium text-[var(--fg-subtle)]">
                {group.timeRange}
              </span>
            )}
          </div>

          {group.items.length === 0 ? (
            <div className="card px-4 py-3 text-sm text-[var(--fg-subtle)]">
              Nothing assigned to this block.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {group.items.map((entry) => (
                <li key={entry.id} className="card overflow-hidden">
                  {entry.kind === "topic" ? (
                    <TopicRow
                      item={entry}
                      open={openId === entry.id}
                      onToggle={() =>
                        setOpenId((c) => (c === entry.id ? null : entry.id))
                      }
                      onGrade={(g) => gradeTopic(entry, g)}
                    />
                  ) : (
                    <PhaseRow
                      phase={entry}
                      open={openId === entry.id}
                      onToggle={() =>
                        setOpenId((c) => (c === entry.id ? null : entry.id))
                      }
                      checked={checkedFor(entry)}
                      onCheck={(tid) => toggleTopic(entry, tid)}
                      onFinish={(g) => finishPhase(entry, g)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {totalLeft === 0 && hasRoutine && (
        <p className="px-1 text-sm text-[var(--fg-subtle)]">
          {isToday
            ? "Everything ticked off. Nice."
            : "Nothing assigned to this day."}
        </p>
      )}
    </div>
  );
}

function TopicRow({
  item,
  open,
  onToggle,
  onGrade,
}: {
  item: DueItem;
  open: boolean;
  onToggle: () => void;
  onGrade: (g: Grade | null) => void;
}) {
  const firstPass = item.rung === 0;
  return (
    <div className="flex items-start gap-3 p-3.5">
      <button
        type="button"
        aria-label={`${firstPass ? "Complete" : "Grade"} ${item.topicName}`}
        aria-expanded={open}
        onClick={onToggle}
        className={
          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors " +
          (open
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
            : "border-[var(--border-strong)] text-transparent hover:border-[var(--accent)]")
        }
      >
        <CheckIcon width={14} height={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{item.topicName}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {item.subject && <span className="chip">{item.subject}</span>}
          <span className="chip">R{item.rung}</span>
          <span className="chip">
            {item.reviewCount > 0
              ? `reviewed ${item.reviewCount}×`
              : "first pass"}
          </span>
          {item.overdue && (
            <span className="chip text-[var(--fail)]">overdue</span>
          )}
        </div>
        {open &&
          (firstPass ? (
            <button
              type="button"
              onClick={() => onGrade(null)}
              className="btn btn-primary btn-sm mt-3 w-full"
            >
              Mark complete
            </button>
          ) : (
            <GradeRow onPick={onGrade} />
          ))}
      </div>
    </div>
  );
}

function PhaseRow({
  phase,
  open,
  onToggle,
  checked,
  onCheck,
  onFinish,
}: {
  phase: DuePhase;
  open: boolean;
  onToggle: () => void;
  checked: Set<string>;
  onCheck: (topicId: string) => void;
  onFinish: (g?: Grade) => void;
}) {
  const needsGrade = phaseNeedsGrade(phase.phase);
  return (
    <div className="p-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
          {phase.phase[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{phase.mainTaskName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="chip text-[var(--accent)]">
              {PHASE_LABEL[phase.phase]}
            </span>
            {phase.subject && <span className="chip">{phase.subject}</span>}
            {phase.overdue && (
              <span className="chip text-[var(--fail)]">overdue</span>
            )}
          </div>
        </div>
      </div>

      {phase.topics.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-l border-[var(--border)] pl-3">
          {phase.topics.map((t) => {
            const on = checked.has(t.id);
            return (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onCheck(t.id)}
                    className="accent-[var(--accent)]"
                  />
                  <span
                    className={
                      on ? "text-[var(--fg-subtle)] line-through" : ""
                    }
                  >
                    {t.name}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {open ? (
        needsGrade ? (
          <GradeRow onPick={(g) => onFinish(g)} />
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onFinish()}
              className="btn btn-primary btn-sm flex-1"
            >
              Mark {PHASE_LABEL[phase.phase]} done
            </button>
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="btn btn-secondary btn-sm mt-3 w-full"
        >
          Finish this phase
        </button>
      )}
    </div>
  );
}
