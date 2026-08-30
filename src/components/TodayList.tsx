"use client";

import { useMemo, useState, useTransition } from "react";
import { gradeItem } from "@/app/actions/study";
import { GRADES, GRADE_LABEL, type Grade } from "@/lib/ladder";
import type { DueItem, TodayGroup } from "@/lib/types";
import { CheckIcon } from "@/components/icons";

const GRADE_STYLE: Record<Grade, string> = {
  good: "hover:border-[var(--good)] hover:text-[var(--good)]",
  shaky: "hover:border-[var(--shaky)] hover:text-[var(--shaky)]",
  fail: "hover:border-[var(--fail)] hover:text-[var(--fail)]",
};

export function TodayList({
  groups: initialGroups,
  isSaturday,
  hasRoutine,
}: {
  groups: TodayGroup[];
  isSaturday: boolean;
  hasRoutine: boolean;
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const groups = useMemo(
    () =>
      initialGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => !removed.has(i.id)) }))
        // keep routine slots visible even when empty; drop an emptied "Anytime"
        .filter((g) => g.timeRange !== null || g.items.length > 0),
    [initialGroups, removed],
  );

  const totalLeft = groups.reduce((n, g) => n + g.items.length, 0);

  function grade(item: DueItem, g: Grade) {
    setError(null);
    setOpenId(null);
    setRemoved((prev) => new Set(prev).add(item.id));
    startTransition(async () => {
      const res = await gradeItem(item.id, g);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setRemoved((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    });
  }

  if (totalLeft === 0 && !hasRoutine) {
    return (
      <div className="card mt-2 px-5 py-10 text-center">
        <p className="text-[var(--fg-muted)]">Nothing due. You&apos;re clear.</p>
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
              {group.items.map((item) => {
                const open = openId === item.id;
                return (
                  <li key={item.id} className="card overflow-hidden">
                    <div className="flex items-start gap-3 p-3.5">
                      <button
                        type="button"
                        aria-label={`Grade ${item.topicName}`}
                        aria-expanded={open}
                        onClick={() =>
                          setOpenId((cur) => (cur === item.id ? null : item.id))
                        }
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
                        <p className="font-medium leading-snug">
                          {item.topicName}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {item.subject && (
                            <span className="chip">{item.subject}</span>
                          )}
                          <span className="chip">R{item.rung}</span>
                          <span className="chip">
                            {item.reviewCount > 0
                              ? `reviewed ${item.reviewCount}×`
                              : "first pass"}
                          </span>
                          {isSaturday && item.overdue && (
                            <span className="chip text-[var(--fail)]">
                              overdue
                            </span>
                          )}
                        </div>

                        {open && (
                          <div className="mt-3 flex gap-2">
                            {GRADES.map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => grade(item, g)}
                                className={
                                  "btn btn-secondary btn-sm flex-1 " +
                                  GRADE_STYLE[g]
                                }
                              >
                                {GRADE_LABEL[g]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      {totalLeft === 0 && hasRoutine && (
        <p className="px-1 text-sm text-[var(--fg-subtle)]">
          Everything ticked off. Nice.
        </p>
      )}
    </div>
  );
}
