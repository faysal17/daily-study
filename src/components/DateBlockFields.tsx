"use client";

import { useId } from "react";

export type BlockOption = { id: string; label: string };

/**
 * Shared date + routine-block field pair used by every "schedule this for a day"
 * surface (the inline schedulers and the new-topic form on the Plan screen).
 * Stacks on narrow screens, two columns from `sm` up. IDs are namespaced with
 * `useId` so several instances can render on one page.
 */
export function DateBlockFields({
  date,
  onDateChange,
  blockId,
  onBlockChange,
  blocks,
  dateLabel = "Study on",
}: {
  date: string;
  onDateChange: (v: string) => void;
  blockId: string;
  onBlockChange: (v: string) => void;
  blocks: BlockOption[];
  dateLabel?: string;
}) {
  const dateFieldId = useId();
  const blockFieldId = useId();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="field-label" htmlFor={dateFieldId}>
          {dateLabel}
        </label>
        <input
          id={dateFieldId}
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor={blockFieldId}>
          Routine block
        </label>
        <select
          id={blockFieldId}
          value={blockId}
          onChange={(e) => onBlockChange(e.target.value)}
          className="input"
        >
          <option value="">Anytime</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
