# Personal Study Tracker

A single-user study tracker. You assign topics to dates; when you mark one done
you grade it **Good / Shaky / Fail** and the app schedules the next review using a
spaced-repetition ladder. The home screen only shows *what to study today*.

Stack: Next.js (App Router) · Supabase (Postgres + Auth) · Vercel (hosting + Cron).

## Screens

| Route      | What it does |
|------------|--------------|
| `/`        | **Today** — topics and main-task phases due today, grouped under the routine time block they're assigned to (plus "Anytime"). A topic's **first pass** (rung 0) is just "Mark complete" — no grade; every review after that is graded Good/Shaky/Fail. Finish a phase (Skim/Notes just "done"; Exam takes a grade and hands the bundle off to per-topic review). Item disappears and the next occurrence is scheduled. On Saturdays also shows overdue items rolled forward from the week. Top banner shows your current/next routine block. Prev / next arrows (`/?d=YYYY-MM-DD`) step to any other day to see what's scheduled. |
| `/tasks`   | **Plan** — the single planning surface (the old *Add* screen is folded in here). **Main tasks**: create a bundle (name + subject + topics), see its phase track (Skim → Notes → Exam → Done), **schedule / reschedule / unschedule** its current phase inline on the card (date + optional routine block), edit its topics, delete it (topics survive). Once the bundle is Done its topics are on their own ladder and the scheduler is replaced by a note. **Topics**: create a topic and put it on a date; every topic with its scheduling summary; expand to see items; move a pending item to another day; delete an item or a whole topic. Topics that belong to a still-running main task can't be scheduled standalone. Topics that belong to a main task are hidden behind a toggle. No auto-suggestions. |
| `/routine` | **Routine** — editable list of daily time blocks (label + start/end + weekdays + active). |
| `/add`     | Redirects to `/tasks` (kept for old bookmarks). |

## Main tasks (Skim → Notes → Exam → hand-off)

A **main task** bundles related topics for a one-off study campaign, one phase at
a time for the whole bundle:

1. **Skim**, then **Notes** — scheduled by you, ticked done (no grade). Finishing
   one unlocks the next.
2. **Exam** — scheduled by you, finished with a Good/Shaky/Fail grade. That grade
   seeds a starting rung (`good`→R2, `shaky`/`fail`→R1) and **hands the bundle
   off**: every bundled topic gets its own `pending` `study_item` at that rung,
   and the main task moves to the terminal **Done** phase.
3. From there each topic is reviewed individually on the spaced-repetition ladder
   below — there is no bundle-level recurring phase. The finished main task is
   kept for history and as a topic grouping.

While a main task is still running (Skim/Notes/Exam) its topics can't be
scheduled standalone — attaching a topic to a bundle drops its pending reviews
(done history is kept). Each phase shows its bundled topics as a checklist on
Today (ticks persist).
Model: `main_tasks`, `main_task_items`, `topics.main_task_id`
([`supabase/migrations/0003_main_tasks.sql`](supabase/migrations/0003_main_tasks.sql));
logic in [`src/lib/phases.ts`](src/lib/phases.ts) and
[`src/app/actions/mainTasks.ts`](src/app/actions/mainTasks.ts).

## Spaced-repetition ladder

Rungs → interval after a review: `R0` same day, `R1` +1d, `R2` +3d, `R3` +7d,
`R4` +14d, `R5` +21d (cap).

- **Good** → +2 rungs (capped at R5)
- **Shaky** → +1 rung (capped at R5)
- **Fail** → back to R1

A topic's first occurrence (rung 0) is the **first pass**: finished with "Mark
complete", no grade, and it moves straight to R1 (first review next day). Grading
starts from the R1 review onward.

On grading, the current item is marked `done` (kept as history — the number of
done rows per topic is the review count shown on Today) and a new `pending` item
is created at the new rung's date. All logic lives server-side in
[`src/lib/ladder.ts`](src/lib/ladder.ts) and [`src/app/actions/study.ts`](src/app/actions/study.ts).

## Overdue handling

Overdue items do **not** pile up on Today. A daily Vercel Cron job
([`/api/cron/rollover`](src/app/api/cron/rollover/route.ts)) finds every
`pending` item with `scheduled_date < today` and moves it to the coming Saturday
(the *next* Saturday if today is already Saturday), stamping `rolled_from` with
the day it was pulled from. Today then surfaces it once that Saturday arrives —
and the day navigation still shows it on its original `rolled_from` day, marked
**overdue**. Completing it from any of those views clears it everywhere; the next
review lands on whatever day the ladder computes (so if that's Friday, it shows
Friday and Saturday is empty). A manual reschedule clears `rolled_from`.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run every file in [`supabase/migrations/`](supabase/migrations/)
   in filename order (`0001_init.sql` → `0002_routine_link.sql` → `0003_main_tasks.sql`
   → `0004_rolled_from.sql` → `0005_phase_handoff.sql`).
3. Authentication → Users → **Add user** → create your single login (email + password).
   Authentication → Providers → Email: turn **Confirm email** off (or confirm the user manually).
4. Project Settings → API → copy the **Project URL**, the **anon** key, and the **service_role** key.

### 2. Environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=            # any long random string
APP_TIMEZONE=Asia/Dhaka
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

### 4. Deploy to Vercel

1. Push to a Git repo and import it in Vercel.
2. Add the same env vars in **Project Settings → Environment Variables**
   (including `CRON_SECRET` — Vercel automatically sends it as the cron
   `Authorization` header).
3. The cron schedule in [`vercel.json`](vercel.json) runs the rollover daily at
   01:00 UTC. Adjust if you want it aligned to a different local hour.

## Non-goals

No note-taking, no analytics/streaks/charts, no multi-user. Responsive web only.
