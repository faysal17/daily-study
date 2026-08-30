"use client";

import { useState, useTransition } from "react";
import { gradeItem } from "@/app/actions/study";
import { GRADES, GRADE_LABEL, type Grade } from "@/lib/ladder";
import type { DueItem } from "@/lib/types";

export function TodayList({
  initialItems,
  isSaturday,
}: {
  initialItems: DueItem[];
  isSaturday: boolean;
}) {
  const [items, setItems] = useState<DueItem[]>(initialItems);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function grade(item: DueItem, g: Grade) {
    setError(null);
    // optimistic: drop it from the list right away
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setOpenId(null);
    startTransition(async () => {
      const res = await gradeItem(item.id, g);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setItems((prev) =>
          [...prev, item].sort((a, b) =>
            a.scheduledDate.localeCompare(b.scheduledDate),
          ),
        );
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 text-center">
        <p className="text-[var(--muted)]">Nothing due. You&apos;re clear.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-label={`Mark ${item.topicName} done`}
                onClick={() =>
                  setOpenId((cur) => (cur === item.id ? null : item.id))
                }
                disabled={pending}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border border-[var(--muted)] hover:bg-[var(--border)]"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{item.topicName}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {item.subject ? `${item.subject} · ` : ""}R{item.rung}
                  {item.reviewCount > 0
                    ? ` · reviewed ${item.reviewCount}×`
                    : " · first pass"}
                  {isSaturday && item.overdue ? " · overdue" : ""}
                </p>

                {openId === item.id && (
                  <div className="mt-3 flex gap-2">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => grade(item, g)}
                        disabled={pending}
                        className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--border)]"
                      >
                        {GRADE_LABEL[g]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
