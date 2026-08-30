# Personal Study Tracker

A single-user study tracker. You assign topics to dates; when you mark one done
you grade it **Good / Shaky / Fail** and the app schedules the next review using a
spaced-repetition ladder. The home screen only shows *what to study today*.

Stack: Next.js (App Router) · Supabase (Postgres + Auth) · Vercel (hosting + Cron).

## Screens

| Route      | What it does |
|------------|--------------|
| `/`        | **Today** — items due today. Tick one → inline Good/Shaky/Fail → it disappears and the next occurrence is scheduled. On Saturdays it also shows overdue items rolled forward from the week. Top banner shows your current/next routine block. |
| `/add`     | **Add / Assign** — put an existing or brand-new topic on a date (defaults to today). No auto-suggestions. |
| `/routine` | **Routine** — editable list of daily time blocks (label + start/end + weekdays + active). Reference only. |

## Spaced-repetition ladder

Rungs → interval after a review: `R0` same day, `R1` +1d, `R2` +3d, `R3` +7d,
`R4` +14d, `R5` +21d (cap).

- **Good** → +2 rungs (capped at R5)
- **Shaky** → +1 rung (capped at R5)
- **Fail** → back to R1

On grading, the current item is marked `done` (kept as history — the number of
done rows per topic is the review count shown on Today) and a new `pending` item
is created at the new rung's date. All logic lives server-side in
[`src/lib/ladder.ts`](src/lib/ladder.ts) and [`src/app/actions/study.ts`](src/app/actions/study.ts).

## Overdue handling

Overdue items do **not** pile up on Today. A daily Vercel Cron job
([`/api/cron/rollover`](src/app/api/cron/rollover/route.ts)) finds every
`pending` item with `scheduled_date < today` and moves it to the coming Saturday
(the *next* Saturday if today is already Saturday). Today then surfaces them only
once that Saturday arrives.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
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
