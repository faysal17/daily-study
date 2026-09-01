"use client";

import { useId } from "react";

/**
 * Subject picker shared by the new-topic and new-main-task forms. It's a plain
 * text input backed by a `<datalist>` of subjects already used elsewhere, so the
 * common case is picking an existing subject from the dropdown while typing a
 * brand-new one still works.
 */
export function SubjectField({
  value,
  onChange,
  subjects,
}: {
  value: string;
  onChange: (v: string) => void;
  subjects: string[];
}) {
  const inputId = useId();
  const listId = useId();
  const hasSuggestions = subjects.length > 0;
  return (
    <div>
      <label className="field-label" htmlFor={inputId}>
        Subject <span className="text-[var(--fg-subtle)]">(optional)</span>
      </label>
      <input
        id={inputId}
        list={hasSuggestions ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        placeholder="e.g. Bangladesh Affairs"
        autoComplete="off"
      />
      {hasSuggestions && (
        <datalist id={listId}>
          {subjects.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
