-- Link a scheduled study item to an optional routine time block.
-- Safe to re-run.

alter table public.study_items
  add column if not exists routine_block_id uuid
  references public.routine_blocks(id) on delete set null;

create index if not exists study_items_routine_idx
  on public.study_items (routine_block_id);
