@AGENTS.md

# Personal Study Tracker

Single-user, single-purpose study app. You assign a topic (or a main-task phase)
to a date; when you finish it you grade **Good / Shaky / Fail** and a
spaced-repetition ladder schedules the next occurrence. The home screen only ever
shows *what to study today*.

Product spec / screen-by-screen behaviour lives in [`README.md`](README.md). This
file is the map for working in the code.

## Stack

- **Next.js 16** (App Router) — see the warning in [`AGENTS.md`](AGENTS.md): this
  Next has breaking changes vs. training data. Read `node_modules/next/dist/docs/`
  before writing framework code.
  - **`src/proxy.ts`**, not `src/middleware.ts` — request middleware is the
    `proxy()` export from `proxy.ts` in this version. `export const config.matcher`
    still works as before.
- **React 19** — Server Components by default; `"use client"` only where noted.
- **Supabase** — Postgres + Auth, accessed through `@supabase/ssr`. No ORM; the
  `supabase-js` query builder is called directly from Server Components / Actions.
- **Tailwind CSS v4** — `@import "tailwindcss"` in [`globals.css`](src/app/globals.css),
  PostCSS plugin only (`@tailwindcss/postcss`). No `tailwind.config`. Theme is
  CSS custom properties.
- **Vercel** — hosting + Cron (`vercel.json`).
- **TypeScript** strict, `target ES2022`, path alias `@/* → src/*`.

## Commands

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
```

No test, lint, or typecheck script is defined. There is no ESLint config. Type-check
with `npx tsc --noEmit` if needed.

## Layout

```
src/
  app/
    layout.tsx              root layout; <ConfirmProvider>, metadata, supabase preconnect
    globals.css             design tokens + .card/.btn/.input/.chip/.page utility classes
    login/                  public login page (requireAnon) + LoginForm client component
    (app)/                  authed route group
      layout.tsx            force-dynamic; calls requireUser() — the auth gate for every screen
      loading.tsx           skeleton for the group
      page.tsx              Today
      tasks/page.tsx        Plan — main tasks + topics + all inline scheduling
      add/page.tsx          redirect stub -> /tasks (old bookmarks)
      routine/page.tsx      Routine editor
    actions/                Server Actions ("use server")
      auth.ts               signIn / signOut  -> AuthState / redirect
      study.ts              assignTopic, gradeItem, rescheduleStudyItem, deleteItem, deleteTopic
      mainTasks.ts          create/delete/setTopics/schedule/reschedule/toggle/complete/delete-phase
      routine.ts            createBlock / updateBlock / deleteBlock (take FormData)
    api/cron/rollover/route.ts   daily overdue rollover (service-role, CRON_SECRET)
  lib/
    ladder.ts              spaced-repetition ladder — pure, single source of truth
    phases.ts              main-task phase flow (skim -> notes -> exam -> recall) — pure
    dates.ts               ISO "YYYY-MM-DD" date math, "today" in APP_TIMEZONE
    types.ts               shared row/view types
    auth.ts                requireUser() / requireAnon()
    supabase/
      server.ts            createClient() for Server Components / Actions / Route Handlers
      client.ts            createClient() for Client Components (browser)
      admin.ts             createAdminClient() — service role, bypasses RLS, CRON ONLY
  components/              all "use client"
    NavBar.tsx, TodayList.tsx, RoutineBanner.tsx, DayNav.tsx,
    TasksView.tsx, MainTasksPanel.tsx, RoutineEditor.tsx,
    DateBlockFields.tsx (shared date + routine-block picker),
    confirm.tsx (useConfirm hook + <dialog>), icons.tsx (inline SVG set)
supabase/migrations/       0001_init, 0002_routine_link, 0003_main_tasks — hand-run, idempotent
```

## Data model (Postgres)

RLS: every table has one policy — `authenticated` gets full access (single-user
app). The cron job uses the service-role key and bypasses RLS.

| Table | Purpose / notable columns |
|---|---|
| `routine_blocks` | Daily time blocks. `days_of_week smallint[]` (0=Sun … 6=Sat), `start_time`/`end_time` (`time`), `active`. |
| `topics` | `name`, `subject`, `main_task_id` → `main_tasks` `ON DELETE SET NULL` (topics outlive their bundle). |
| `study_items` | One scheduled instance of a topic. `status` `pending`\|`done`, `rung` 0–5, `grade`, `routine_block_id`. `topic_id` `ON DELETE CASCADE`. **Done rows are never deleted on grading — they are the review log; the count of done rows is the "reviewed N×" shown on Today.** |
| `main_tasks` | A named bundle of topics. `phase` `skim`\|`notes`\|`exam`\|`recall`, `rung` 0–5 (recall only). |
| `main_task_items` | One scheduled phase of a main task. `checked_topic_ids uuid[]` persists the per-phase checklist ticks. At most one `pending` row per main task at a time (enforced in `scheduleMainTaskPhase`). |

## Domain logic (keep in `src/lib`, keep pure)

**Spaced-repetition ladder** — [`src/lib/ladder.ts`](src/lib/ladder.ts)
- Rungs R0–R5, intervals `[0, 1, 3, 7, 14, 21]` days after a review.
- `good` → +2 rungs · `shaky` → +1 · `fail` → back to R1. All clamped to R5.

**Main-task phase flow** — [`src/lib/phases.ts`](src/lib/phases.ts)
- `skim → notes → exam → recall`. Skim/Notes are ticked done, no grade;
  finishing one advances `main_tasks.phase`.
- `exam` is graded; the grade seeds the recall rung (`good`→R2, `shaky`/`fail`→R1)
  and flips `phase` to `recall`.
- `recall` is the recurring phase — grading it runs the ladder and inserts the
  next `pending` `main_task_items` row.

**Grading a `study_item`** — [`gradeItem` in study.ts](src/app/actions/study.ts)
- Marks the current row `done` + records grade + `last_reviewed_at`.
- Inserts a fresh `pending` row for the same topic at the new rung's date,
  carrying the same `routine_block_id`.

**Dates** — [`src/lib/dates.ts`](src/lib/dates.ts)
- All scheduling math is on `"YYYY-MM-DD"` strings so it never drifts with the
  server's UTC clock. "Today" is resolved in `APP_TIMEZONE` (default
  `Asia/Dhaka`).
- Use `todayISO()`, `addDaysISO()`, `weekdayOf()`, `comingSaturdayISO()` — do
  **not** do `Date` arithmetic for scheduling.

**Today page** — [`src/app/(app)/page.tsx`](src/app/(app)/page.tsx)
- The viewed day comes from `?d=YYYY-MM-DD` (validated with `isISODate`, falls
  back to today). [`DayNav`](src/components/DayNav.tsx) is prev/next links to
  `/?d=…`; `/` (no param) is always today.
- Shows `pending` items/phases with `scheduled_date == selected`.
- Only when viewing **today** and it is **Saturday** does it widen to
  `<= today` (the week's rolled-forward overdue catch-up). `RoutineBanner` (live
  "now / next block") also renders only for today.
- Rows are bucketed under the routine block they're assigned to (matched against
  the selected day's weekday) plus an "Anytime" bucket for unassigned rows.
- Supabase nested selects come back as `T | T[] | null`; the local `one()` helper
  normalizes them.
- Grading / finishing still works on any day; the ladder always schedules the
  next occurrence from the real `todayISO()`, not the viewed day.

**Overdue rollover** — [`src/app/api/cron/rollover/route.ts`](src/app/api/cron/rollover/route.ts)
- Daily Vercel Cron (`vercel.json`, `0 1 * * *` UTC) hits `/api/cron/rollover`
  with `Authorization: Bearer <CRON_SECRET>`.
- Moves every `pending` `study_items` / `main_task_items` row with
  `scheduled_date < today` to `comingSaturdayISO(today)`.
- Uses `createAdminClient()` (service role). The `/api/cron` path is excluded
  from the `proxy.ts` matcher.

## Auth

- **`src/proxy.ts`** runs on every request and only refreshes the Supabase
  session cookie. It deliberately **never redirects** — Next strips the RSC
  headers before middleware, so a redirect here turns a soft navigation into a
  full-page reload.
- Gating happens in the pages: **`requireUser()`** ([`src/lib/auth.ts`](src/lib/auth.ts))
  does the verified `supabase.auth.getUser()` check and `redirect("/login")` from
  the Server Component (handled as a soft nav). `requireAnon()` bounces a
  signed-in user off `/login`.
- `(app)/layout.tsx` is `force-dynamic` and calls `requireUser()` — that's the
  single gate for all authed screens.
- **Single user, no signup.** The login is created by hand in the Supabase
  dashboard (see README setup).

## Conventions

- **Server Actions** return `ActionResult { ok: boolean; error?: string; message?: string }`.
  Exceptions: `auth.ts` returns `AuthState` for `useActionState`; `routine.ts`
  actions take `FormData`.
- After a write, actions call `revalidatePath` for `/` and `/tasks`
  (`routine.ts` also `/routine`). All authed pages are `export const dynamic = "force-dynamic"`.
- **Client components** drive mutations with `useTransition` + `router.refresh()`.
  `TodayList` removes a row from local state immediately, then reconciles /
  restores it if the action fails.
- **Confirmation prompts**: `useConfirm()` from [`src/components/confirm.tsx`](src/components/confirm.tsx)
  (a promise-based native `<dialog>`) — never `window.confirm`.
- **Styling**: Tailwind utilities + the design tokens and component classes in
  [`globals.css`](src/app/globals.css) (`--bg`, `--fg`, `--fg-muted`, `--accent`,
  `--good`/`--shaky`/`--fail`, `.card`, `.btn`, `.btn-primary/-secondary/-ghost/-danger`,
  `.input`, `.chip`, `.page`). Light/dark via `prefers-color-scheme`. Icons are
  inline SVG in [`src/components/icons.tsx`](src/components/icons.tsx) — add new
  ones there, no icon package.
- **Keep `src/lib/ladder.ts`, `phases.ts`, `dates.ts` pure** (no I/O, no ambient
  clock beyond `todayISO`'s default arg). They are the single source of truth for
  scheduling.

## Environment

Copy `.env.example` → `.env.local`:

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Used solely by the cron route. Never import `admin.ts` into client-reachable code. |
| `CRON_SECRET` | Any long random string. Vercel sends it as the cron `Authorization` header. |
| `APP_TIMEZONE` | IANA name; drives "today" and the rollover. Default `Asia/Dhaka`. |

## Gotchas

- **`next dev` rewrites the `nextjs-agent-rules` block in `AGENTS.md`.** If it
  shows up as an uncommitted change, commit it with your work — deleting it just
  regenerates it.
- Migrations are **not** applied by a tool — run each file in
  `supabase/migrations/` by hand in the Supabase SQL editor, in filename order.
  Every file is written to be safe to re-run.
- `/add` is a redirect stub to `/tasks`; the Plan screen (`tasks/page.tsx` +
  `MainTasksPanel` / `TasksView`) owns all scheduling. The "one open phase per
  main task" rule is still enforced in `scheduleMainTaskPhase` as a backstop.
- The topic-level **Schedule** button calls `assignTopic`, which starts a new
  item at **R0** regardless of the topic's history (same as the old Add screen).
- `RoutineBanner` uses the browser `Notification` API for a start-of-block
  reminder; it is best-effort and client-only.
