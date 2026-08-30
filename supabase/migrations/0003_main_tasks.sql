-- Main tasks: a named bundle of topics that moves through a fixed flow
--   skim -> notes -> exam -> recall
-- Skim/Notes/Exam happen once; Recall is the recurring spaced-repetition phase.
-- Safe to re-run.

create table if not exists public.main_tasks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subject    text,
  phase      text not null default 'skim'
             check (phase in ('skim', 'notes', 'exam', 'recall')),
  rung       smallint not null default 0 check (rung between 0 and 5),
  created_at timestamptz not null default now()
);

-- A topic may belong to one main task (or none). Topics outlive their main task.
alter table public.topics
  add column if not exists main_task_id uuid
  references public.main_tasks(id) on delete set null;
create index if not exists topics_main_task_idx on public.topics (main_task_id);

-- One phase of a main task, scheduled for a date.
create table if not exists public.main_task_items (
  id                uuid primary key default gen_random_uuid(),
  main_task_id      uuid not null references public.main_tasks(id) on delete cascade,
  phase             text not null check (phase in ('skim', 'notes', 'exam', 'recall')),
  scheduled_date    date not null,
  status            text not null default 'pending' check (status in ('pending', 'done')),
  rung              smallint not null default 0 check (rung between 0 and 5), -- recall only
  grade             text check (grade in ('good', 'shaky', 'fail')),         -- exam + recall
  routine_block_id  uuid references public.routine_blocks(id) on delete set null,
  checked_topic_ids uuid[] not null default '{}',
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create index if not exists main_task_items_due_idx
  on public.main_task_items (scheduled_date, status);
create index if not exists main_task_items_task_idx
  on public.main_task_items (main_task_id);

alter table public.main_tasks      enable row level security;
alter table public.main_task_items enable row level security;

drop policy if exists "authenticated full access" on public.main_tasks;
drop policy if exists "authenticated full access" on public.main_task_items;

create policy "authenticated full access" on public.main_tasks
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.main_task_items
  for all to authenticated using (true) with check (true);
