# Reps

**The daily loop, verified.** A character-driven personal operating system for
becoming a real software engineer: a generated plan says what today should
contain, a pixel character lives on your contribution grid, and the daily
Commit task only checks off when a **real public GitHub commit** exists — the
app refuses to let you lie to yourself.

Full product spec: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) ·
Engineering conventions: [CLAUDE.md](CLAUDE.md)

## Status — Phase 1 (the loop) is built

Per spec §16, only Phase 1 exists so far, and it's complete:

- **Auth** — GitHub OAuth (Auth.js v5). Sign-in doubles as connecting the
  handle that commit verification reads.
- **Onboarding** — hours/week + intensity (chill/steady/grind) + track
  toggles → generates a dated 12-week program.
- **Home ("Day X")** — today's task blobs from the schedule + standing
  tasks, live "1/3" counter, the character on the week-strip terrain,
  month contribution grid, icon rail, Plan button.
- **Schedule** — landscape week grid (Day / BYOX / Project / LeetCode /
  LinkedIn / Th / Note), per-cell hour steppers, add/remove tasks, notes,
  multi-select mark-done, non-destructive regeneration.
- **GitHub commit verification** — sync on app open + a cron backstop
  every 30 min. Found commit → Commit checks itself off. No commit → it
  stays pending; there is **no manual override** while the toggle is on.
- **Character** — hand-authored pixel sprite with real frame-based states:
  idle (breathing/blink), task-done flourish, all-done celebration,
  streak-loss slump.
- **Settings** — LeetCode / Gym / daily-commit toggles that genuinely
  remove tracks from tasks, Schedule columns, *and* stats; timezone
  (defines the "today" verification boundary); sign out.

**Not built yet, deliberately** (spec §16 Phase 2+): Finance, Ideas Pool,
Tutorials, Customize. Their routes exist as honest placeholders. The `ideas`
table exists schema-only because v1 architecture must keep the
`ScheduleTask.idea_id → Idea` seam (spec §12).

## Running it

```bash
npm install
npm run dev
```

That's genuinely all for local dev:

- **No database setup** — without `DATABASE_URL`, the app runs an embedded
  [PGlite](https://pglite.dev/) Postgres in `.pglite/` that migrates itself
  on boot. Point `DATABASE_URL` at Neon for production; same schema, same
  Drizzle queries.
- **No OAuth app needed locally** — put `AUTH_DEV_MODE=true` in `.env.local`
  and a dev sign-in (any GitHub handle) appears on `/signin`. It is compiled
  out of production builds. For real OAuth, register a GitHub OAuth app and
  set `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` / `AUTH_SECRET`
  (see [.env.example](.env.example)).

### Checks

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # Vitest — schedule generation, verification, streak math
npm run test:e2e   # Playwright — the full loop against a mock GitHub API
```

The e2e suite boots its own dev server (own `.next-e2e` dist + `.pglite-e2e`
database) so it runs fine alongside your dev server, and proves both
verification outcomes: *no commit → task refuses to check* and *real commit →
auto-check + grid lights up*.

## Architecture

```
app/                    Next.js App Router routes (thin — screens only)
components/             UI components (character, grids, blobs, forms)
lib/core/               framework-agnostic logic: schedule generation,
                        commit verification, streak/contribution math, dates
lib/server/             server layer: session→user, day-state assembly,
                        rollups, sync service, server actions
lib/db/                 Drizzle schema, driver switch (Neon ⇄ PGlite),
                        generated SQL migrations
tests/unit/             Vitest against lib/core
tests/e2e/              Playwright + mock GitHub events server
```

Design decisions worth knowing:

- **`lib/core` is pure.** Schedule generation and commit verification are
  deterministic functions with no framework or DB imports — a future native
  client hits the same logic through the API layer (spec §1.4).
- **Verification can be pending, but it cannot lie.** A failed GitHub API
  call is reported as *unavailable*, never as "no commit" — and there is no
  code path that returns a found commit without one in the payload.
  `GITHUB_API_URL` is overridable **only** so tests can run a mock server.
- **"Today" is the user's timezone**, stored per user, captured at
  onboarding, editable in Settings. Commit verification and Day X both hang
  off it (spec open Q7 — see below).
- **Toggles remove, not hide.** Track filtering happens in the data layer
  (`enabledTracks` / `enabledStandingTypes`) and completion rollups are
  recomputed on change, so a disabled track vanishes from history stats too.
- **`DayCompletion`** is the denormalized rollup driving the grid and
  streaks, recomputed on every mutation of a day's tasks.

## Defaults chosen for spec §15 open questions

Flagged here so they're easy to revisit:

- **Q1 (character reactions):** idle / task-done flourish / all-done
  celebration / streak-loss slump.
- **Q2 (what colors the grid):** all task completion (done/total → level
  0–4); the verified Commit counts as one task among them.
- **Q7 (timezone boundary):** a commit counts for the local calendar day on
  which its push became public, in the user's stored timezone.
- **Streak definition:** a day counts when *all* of its tasks are done; Rest
  days pass through; an in-progress today never breaks a streak.

## Aesthetic direction

**"Clay & Glass"** (v2 — replaced the original terminal look at the product
owner's direction): a light, Apple-grade surface language — porcelain base,
white cards with diffuse depth, frosted glass, hairline separators, the iOS
system palette for track colors, Manrope with tabular numerals, spring
physics on every interaction (framer-motion).

The character is a **procedural 3D clay person** built entirely in code
(three.js / react-three-fiber — no downloaded model): brand-green hoodie,
headphones with accent-ring cups, blinking eyes, breathing, weight shift.
Real pose states, not color swaps: idle / flourish (task checked: jump,
arms up, happy squint) / celebrate (day complete) / slump (streak lost).
Performance is deliberate: no shadow maps, blob shadow + lighting only,
so weak GPUs hold frame rate.

The signature element survived the redesign: **the character lives on the
grid** — the current week is a path of 3D clay tiles it stands on. Today's
tile glows greener as tasks complete, broken days sink into the floor, and
the daily "1/3" is an Apple-Fitness-style ring. The Schedule is iOS day
cards with a bottom-sheet regenerate flow instead of a data table.

## Deploying

Vercel + Neon:

1. Create a Neon database, set `DATABASE_URL`, run `npm run db:migrate`.
2. Register a GitHub OAuth app (callback:
   `https://<domain>/api/auth/callback/github`), set `AUTH_GITHUB_ID`,
   `AUTH_GITHUB_SECRET`, `AUTH_SECRET`.
3. Set `CRON_SECRET`; `vercel.json` already schedules `/api/sync` every
   30 minutes.
4. Do **not** set `AUTH_DEV_MODE` in production (it's inert there, but
   don't).
