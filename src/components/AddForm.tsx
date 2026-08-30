"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTopic } from "@/app/actions/study";
import type { Topic } from "@/lib/types";

export function AddForm({
  topics,
  today,
}: {
  topics: Topic[];
  today: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(
    topics.length > 0 ? "existing" : "new",
  );
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    startTransition(async () => {
      const res = await assignTopic({
        topicId: mode === "existing" ? topicId : undefined,
        newTopicName: mode === "new" ? name : undefined,
        subject: mode === "new" ? subject : undefined,
        date,
      });
      if (res.ok) {
        setNote({ ok: true, text: res.message ?? "Assigned." });
        setName("");
        setSubject("");
        router.refresh();
      } else {
        setNote({ ok: false, text: res.error ?? "Something went wrong." });
      }
    });
  }

  const inputCls =
    "rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "existing"}
            onChange={() => setMode("existing")}
            disabled={topics.length === 0}
          />
          Existing topic
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            checked={mode === "new"}
            onChange={() => setMode("new")}
          />
          New topic
        </label>
      </div>

      {mode === "existing" ? (
        <label className="flex flex-col gap-1 text-sm">
          Topic
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className={inputCls}
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.subject ? ` — ${t.subject}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Topic name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Bangladesh Liberation War — phases"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Subject <span className="text-[var(--muted)]">(optional)</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputCls}
              placeholder="e.g. Bangladesh Affairs"
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Study on
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
          required
        />
      </label>

      {note && (
        <p
          className={
            "text-sm " + (note.ok ? "text-green-600" : "text-red-600")
          }
        >
          {note.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-[var(--bg)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Assign"}
      </button>
    </form>
  );
}
