-- Phase hand-off (Approach B):
-- A main task now runs Skim -> Notes -> Exam and then *dissolves*. Grading the
-- Exam fans every bundled topic out as its own study_item on the spaced-
-- repetition ladder; there is no more bundle-level "recall" phase. The main
-- task lands in a terminal 'done' phase and is kept only for history/grouping.
--
-- Safe to re-run.

-- 1. Allow the terminal 'done' phase.
alter table public.main_tasks       drop constraint if exists main_tasks_phase_check;
alter table public.main_task_items  drop constraint if exists main_task_items_phase_check;

alter table public.main_tasks
  add constraint main_tasks_phase_check
  check (phase in ('skim', 'notes', 'exam', 'recall', 'done'));
alter table public.main_task_items
  add constraint main_task_items_phase_check
  check (phase in ('skim', 'notes', 'exam', 'recall', 'done'));

-- 2. Retire main tasks that already reached the old 'recall' phase: fan their
--    topics out onto the ladder at the bundle's current rung, drop the pending
--    bundle-level recall row, mark the main task done.
insert into public.study_items (topic_id, scheduled_date, status, rung, routine_block_id)
select t.id,
       current_date + (array[0, 1, 3, 7, 14, 21])[mt.rung + 1],
       'pending',
       mt.rung,
       null
from public.topics t
join public.main_tasks mt on mt.id = t.main_task_id
where mt.phase = 'recall'
  and not exists (
    select 1 from public.study_items si
    where si.topic_id = t.id and si.status = 'pending'
  );

delete from public.main_task_items
where phase = 'recall' and status = 'pending';

update public.main_tasks set phase = 'done' where phase = 'recall';

-- 3. Enforce "the phase flow owns its topics": while a main task is still
--    running (skim/notes/exam) its topics must not carry standalone pending
--    reviews. Done history is left untouched.
delete from public.study_items si
using public.topics t
where si.topic_id = t.id
  and si.status = 'pending'
  and t.main_task_id is not null
  and exists (
    select 1 from public.main_tasks mt
    where mt.id = t.main_task_id
      and mt.phase in ('skim', 'notes', 'exam')
  );
