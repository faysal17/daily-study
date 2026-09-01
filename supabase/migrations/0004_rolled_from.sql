-- Track the day an item was pulled from by the overdue rollover.
-- The Today screen's day navigation uses this to still surface a rolled-forward
-- item on the day it was originally due (not only on the Saturday catch-up).
-- Cleared when an item is completed (it becomes a done row) or rescheduled by
-- hand. Safe to re-run.

alter table public.study_items
  add column if not exists rolled_from date;

alter table public.main_task_items
  add column if not exists rolled_from date;

create index if not exists study_items_rolled_from_idx
  on public.study_items (rolled_from)
  where rolled_from is not null;

create index if not exists main_task_items_rolled_from_idx
  on public.main_task_items (rolled_from)
  where rolled_from is not null;
