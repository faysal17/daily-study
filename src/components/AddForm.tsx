"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { assignTopic } from "@/app/actions/study";
import { scheduleMainTaskPhase } from "@/app/actions/mainTasks";
import { PHASE_LABEL, type Phase } from "@/lib/phases";
import type { Topic } from "@/lib/types";
import { DateBlockFields } from "@/components/DateBlockFields";

type MainTaskOpt = {
  id: string;
  name: string;
  phase: Phase;
  hasOpenItem: boolean;
};
type Note = { ok: boolean; text: string } | null;

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border-strong)] p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={
            "rounded-[7px] px-3 py-1.5 font-medium transition-colors disabled:opacity-40 " +
            (value === o.value
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "text-[var(--fg-muted)] hover:text-[var(--fg)]")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AddForm({
  topics,
  blocks,
  mainTasks,
  today,
}: {
  topics: Topic[];
  blocks: { id: string; label: string }[];
  mainTasks: MainTaskOpt[];
  today: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"topic" | "main">("topic");

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "topic", label: "Topic" },
          { value: "main", label: "Main task phase" },
        ]}
      />
      {kind === "topic" ? (
        <TopicForm
          topics={topics}
          blocks={blocks}
          today={today}
          onDone={() => router.refresh()}
        />
      ) : (
        <MainPhaseForm
          mainTasks={mainTasks}
          blocks={blocks}
          today={today}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

function TopicForm({
  topics,
  blocks,
  today,
  onDone,
}: {
  topics: Topic[];
  blocks: { id: string; label: string }[];
  today: string;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    topics.length > 0 ? "existing" : "new",
  );
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(today);
  const [blockId, setBlockId] = useState("");
  const [note, setNote] = useState<Note>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    start(async () => {
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
        onDone();
      } else {
        setNote({ ok: false, text: res.error ?? "Something went wrong." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-4">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          {
            value: "existing",
            label: "Existing topic",
            disabled: topics.length === 0,
          },
          { value: "new", label: "New topic" },
        ]}
      />

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

      <DateBlockFields
        date={date}
        onDateChange={setDate}
        blockId={blockId}
        onBlockChange={setBlockId}
        blocks={blocks}
      />

      <FormNote note={note} />
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

function MainPhaseForm({
  mainTasks,
  blocks,
  today,
  onDone,
}: {
  mainTasks: MainTaskOpt[];
  blocks: { id: string; label: string }[];
  today: string;
  onDone: () => void;
}) {
  const selectable = mainTasks;
  const [mtId, setMtId] = useState(selectable[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [blockId, setBlockId] = useState("");
  const [note, setNote] = useState<Note>(null);
  const [pending, start] = useTransition();

  const selected = useMemo(
    () => selectable.find((m) => m.id === mtId) ?? null,
    [selectable, mtId],
  );

  if (mainTasks.length === 0) {
    return (
      <div className="card p-4 text-sm text-[var(--fg-muted)]">
        No main tasks yet.{" "}
        <Link href="/tasks" className="text-[var(--accent)] underline">
          Create one on the Tasks screen
        </Link>
        , then schedule its phases here.
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    if (!selected) return;
    if (selected.hasOpenItem) {
      setNote({
        ok: false,
        text: "That main task already has a phase scheduled. Finish it first.",
      });
      return;
    }
    start(async () => {
      const res = await scheduleMainTaskPhase({
        mainTaskId: selected.id,
        date,
        routineBlockId: blockId || undefined,
      });
      setNote({
        ok: res.ok,
        text: res.ok ? res.message ?? "Scheduled." : res.error ?? "Failed.",
      });
      if (res.ok) onDone();
    });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-4">
      <div>
        <label className="field-label" htmlFor="mt">
          Main task
        </label>
        <select
          id="mt"
          value={mtId}
          onChange={(e) => setMtId(e.target.value)}
          className="input"
        >
          {selectable.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <p className="text-sm text-[var(--fg-muted)]">
          Current phase:{" "}
          <span className="font-medium text-[var(--fg)]">
            {PHASE_LABEL[selected.phase]}
          </span>
          {selected.hasOpenItem && (
            <span className="text-[var(--fail)]">
              {" "}
              — already scheduled, finish it first
            </span>
          )}
        </p>
      )}

      <DateBlockFields
        date={date}
        onDateChange={setDate}
        blockId={blockId}
        onBlockChange={setBlockId}
        blocks={blocks}
      />

      <FormNote note={note} />
      <button
        type="submit"
        disabled={pending || !selected || selected.hasOpenItem}
        className="btn btn-primary self-start"
      >
        {pending ? "Scheduling…" : "Schedule phase"}
      </button>
    </form>
  );
}

function FormNote({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p
      className={
        "text-sm " + (note.ok ? "text-[var(--good)]" : "text-[var(--fail)]")
      }
    >
      {note.text}
    </p>
  );
}
