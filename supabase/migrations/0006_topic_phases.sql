-- Every topic now runs the same lifecycle a main task's bundle does:
--   skim -> notes -> exam -> recall
-- Skim/Notes are ticked done (no grade), Exam is graded and seeds the recall
-- rung, Recall is the recurring spaced-repetition phase. A standalone topic runs
-- all four solo; a bundled topic's first three phases are driven by its main
-- task, which hands each topic off to its own Recall after the Exam.
--
-- Safe to re-run.

-- 1. Phase + rung on the topic itself, and a phase on each scheduled instance.
alter table public.topics
  add column if not exists phase text not null default 'skim'
    check (phase in ('skim', 'notes', 'exam', 'recall', 'done'));
alter table public.topics
  add column if not exists rung smallint not null default 0
    check (rung between 0 and 5);

alter table public.study_items
  add column if not exists phase text not null default 'recall'
    check (phase in ('skim', 'notes', 'exam', 'recall', 'done'));

create index if not exists study_items_phase_idx on public.study_items (phase);

-- 2. Restart every standalone topic at Skim. Convert its pending reviews in
--    place (keep the date, drop the ladder position); done rows are history and
--    are left alone.
update public.topics
  set phase = 'skim', rung = 0
  where main_task_id is null;

update public.study_items
  set phase = 'skim', rung = 0
  where status = 'pending'
    and topic_id in (select id from public.topics where main_task_id is null);

-- 3. Topics whose bundle already handed off (main task 'done') are mid-Recall.
--    Point their phase at recall and carry the rung from the study_item the
--    hand-off created.
update public.topics t
  set phase = 'recall',
      rung  = coalesce((
        select max(s.rung) from public.study_items s
        where s.topic_id = t.id and s.status = 'pending'
      ), 0)
  from public.main_tasks mt
  where t.main_task_id = mt.id and mt.phase = 'done';

update public.study_items s
  set phase = 'recall'
  where s.status = 'pending'
    and s.topic_id in (
      select t.id from public.topics t
      join public.main_tasks mt on mt.id = t.main_task_id
      where mt.phase = 'done'
    );

-- 4. Topics in a still-running bundle keep the default 'skim' — the value is
--    ignored while the main task drives their first three phases.
