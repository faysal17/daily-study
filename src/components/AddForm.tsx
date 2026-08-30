"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTopic } from "@/app/actions/study";
import type { Topic } from "@/lib/types";

export function AddForm({
  topics,
  blocks,
  today,
}: {
  topics: Topic[];
  blocks: { id: string; label: string }[];
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
  const [blockId, setBlockId] = useState("");
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
        routineBlockId: blockId || undefined,
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

  const Segmented = (
    <div className="inline-flex rounded-lg border border-[var(--border-strong)] p-0.5 text-sm">
      {(["existing", "new"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          disabled={m === "existing" && topics.length === 0}
          className={
            "rounded-[7px] px-3 py-1.5 font-medium transition-colors disabled:opacity-40 " +
            (mode === m
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "text-[var(--fg-muted)] hover:text-[var(--fg)]")
          }
        >
          {m === "existing" ? "Existing topic" : "New topic"}
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-4">
      {Segmented}

      {mode === "existing" ? (
        <div>
          <label className="field-label" htmlFor="topic">
            Topic
          </label>
          <select
            id="topic"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="input"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.subject ? ` — ${t.subject}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div>
            <label className="field-label" htmlFor="name">
              Topic name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Liberation War — phases"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="subject">
              Subject <span className="text-[var(--fg-subtle)]">(optional)</span>
            </label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="e.g. Bangladesh Affairs"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="date">
            Study on
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="block">
            Routine block
          </label>
          <select
            id="block"
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
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

      {note && (
        <p
          className={
            "text-sm " +
            (note.ok ? "text-[var(--good)]" : "text-[var(--fail)]")
          }
        >
          {note.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary self-start"
      >
        {pending ? "Saving…" : "Assign"}
      </button>
    </form>
  );
}
