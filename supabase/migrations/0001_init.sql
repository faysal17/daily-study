-- Personal Study Tracker — initial schema
-- Safe to re-run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- routine_blocks — the daily schedule, edited freely by the user
-- ---------------------------------------------------------------------------
create table if not exists public.routine_blocks (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  start_time   time not null,
  end_time     time not null,
  days_of_week smallint[] not null default '{}',   -- 0 = Sunday ... 6 = Saturday
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- topics — things being studied
-- ---------------------------------------------------------------------------
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subject    text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- study_items — one instance of a topic scheduled for a date.
-- Done rows are never deleted; they are the review log.
-- ---------------------------------------------------------------------------
create table if not exists public.study_items (
  id               uuid primary key default gen_random_uuid(),
  topic_id         uuid not null references public.topics(id) on delete cascade,
  scheduled_date   date not null,
  status           text not null default 'pending' check (status in ('pending', 'done')),
  rung             smallint not null default 0 check (rung between 0 and 5),
  grade            text check (grade in ('good', 'shaky', 'fail')),
  created_at       timestamptz not null default now(),
  last_reviewed_at timestamptz
);

create index if not exists study_items_due_idx
  on public.study_items (scheduled_date, status);
create index if not exists study_items_topic_idx
  on public.study_items (topic_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Single-user app: any authenticated user has full access. The cron job uses
-- the service-role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.routine_blocks enable row level security;
alter table public.topics         enable row level security;
alter table public.study_items    enable row level security;

drop policy if exists "authenticated full access" on public.routine_blocks;
drop policy if exists "authenticated full access" on public.topics;
drop policy if exists "authenticated full access" on public.study_items;

create policy "authenticated full access" on public.routine_blocks
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.topics
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.study_items
  for all to authenticated using (true) with check (true);
