# Reps

**The daily loop, verified.** A character-driven personal operating system for
becoming a real software engineer: a generated plan says what today should
contain, a cinematic character reacts to how the day goes, and the daily
Commit task only checks off when a **real public GitHub commit** exists — the
app refuses to let you lie to yourself.

Full product spec: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)

## Status — Phases 1–3 built

Per spec §16, the daily loop (Phase 1), all four hubs (Phase 2: Finance,
Ideas Pool, Tutorials, Customize), and the Phase 3 assists — Schedule
month view, schedule auto-plan, streak-milestone animation, receipt scan,
and the Ideas brainstorm agent — are all built:

- **Auth** — GitHub OAuth (Auth.js v5). Sign-in doubles as connecting the
  handle that commit verification reads.
- **Onboarding** — hours/week + intensity (chill/steady/grind) + track
  toggles → generates a dated 12-week program.
- **Home ("Day X")** — today's tasks from the schedule + standing tasks,
  the completion ring, the living character portrait with the week strip,
  month contribution grid, hub row, Plan card.
- **Schedule** — iOS-style day cards with a week pager: tap-to-complete
  task rows, hour steppers, add/remove tasks, notes, multi-select
  mark-done, bottom-sheet regeneration. Future days are plannable but
  locked for completion.
- **GitHub commit verification** — sync on app open + a cron backstop
  every 30 min. Found commit → Commit checks itself off. No commit → it
  stays pending; there is **no manual override** while the toggle is on.
- **Character** — pre-rendered cinematic portraits driven by a live state
  machine: idle (with breathing, parallax, and a hands-in-pockets fidget),
  task-done flourish, all-done celebration, streak-loss slump, and a wink
  on tap or on a verified commit.
- **Settings** — LeetCode / Gym / daily-commit toggles that genuinely
  remove tracks from tasks, Schedule columns, *and* stats; timezone
  (defines the "today" verification boundary); sign out.
- **Finance** (Phase 2, spec §7) — money as a growth readout, not budget
  guilt: manual income/spending entries in integer cents, a
  week/month/year/custom period carousel that recomputes every chart
  instantly, the In-vs-out totals card, a per-day breakdown with an
  Income/Spending sub-toggle, and a hand-drawn SVG Sankey (income
  categories → gross → spending categories + Net, with an explicit
  "Overspent" source when the books don't balance). Categories are
  seeded defaults plus user-created types inserted straight from the
  Add form's dropdown. No chart library — the charts are divs, springs,
  and one SVG.

- **Ideas Pool** (Phase 2, spec §9) — a filterable pin-board of what to
  build next: BYOX / SaaS / Project cards seeded once with nine curated,
  genuinely buildable ideas (text-to-SQL IDE, vector DB, build-your-own-
  Redis — never filler, per §9.3), plus add/edit/delete. The load-bearing
  move is **Plan it**: a bottom sheet places an idea into a stretch of
  schedule weeks as the Project Work — its name takes over those
  sessions on Home and Schedule (the `ScheduleTask.idea_id → Idea` seam,
  live). Renaming an idea renames its sessions; deleting one restores
  the generic label.

- **Tutorials** (Phase 2, spec §11) — the curated learning shelf: ten
  seeded classics (Build-Your-Own-X, Project-Based-Learning, CS50, the
  from-scratch books, plus the sketch's ASP/C#/AI cards), language and
  topic chip filters that combine, links opening in a new tab with host
  provenance, and full curation (add with vocabulary-suggesting
  datalists, edit, delete — seeds included). Seeded once per user, same
  contract as Ideas.

- **Customize** (Phase 2, spec §10) — the character's gallery lighting:
  five ambiances (Studio/Dawn/Neon/Forest/Noir) that wash over the
  portrait's blurred backdrop and re-color its display case, previewed
  live on the real Home hero and persisted to `users.cosmetics`. The
  spec's parameterized avatar was reframed for the pre-rendered
  character (Path A): appearance variants are portrait-pack art, so
  code-side cosmetics theme presentation; the jsonb config is built to
  hold outfit packs later.

- **Schedule month view** (Phase 3, spec §8.4) — a Week ⇄ Month toggle
  (URL-driven) opens a read-only overview of the whole program: each week
  a row of day tiles showing planned hours, past days filling in with the
  contribution tint, today ringed. Tap a week to edit it.

- **Schedule auto-plan** (Phase 3, spec §9.4) — the Ideas Pool can fill
  the plan's Project Work weeks from the pool in one tap, each idea sized
  to its hours against the plan's project capacity (which scales with
  intensity), capped so no single idea hogs more than a third of the
  horizon. Honestly a deterministic packer, labelled "Auto-plan," not
  "AI"; an LLM-ranked variant would build on the same server action.

- **Milestone celebration** (Phase 3, spec §6.3/§6.5) — crossing a sparse
  streak milestone (3/7/14/30/…) fires a one-time burst over the
  character: an expanding glow, radiating sparks, and a frosted
  "N day streak" card. Streak-loss keeps its slump portrait.

- **Receipt scan** (Phase 3, spec §7.4) — on the Add Finance spending
  side, a photo → editable {amount, semantic category} suggestion via
  Claude vision. The hard part (spec §7.3: ice cream files under *Food*,
  not "ice cream") is handled by handing the model the user's real
  categories and asking it to map semantically; the amount is never
  logged. Entries record `source='receipt'`.

- **Brainstorm agent** (Phase 3, spec §9.2/§9.3) — the Add Idea screen
  opens a chat that asks orienting questions and proposes *buildable*
  projects as cards that prefill the form. Guard-railed against filler
  (spec §15.5) by a system prompt seeded with the curated pool as the
  quality bar, plus structured output re-validated server-side.

Both AI assists run on the official `@anthropic-ai/sdk` through one seam
(`lib/server/claude.ts`): the model is a single constant (Opus 4.8), and
everything is gated on `ANTHROPIC_API_KEY` — **with no key the two
features render disabled with an explanatory label and the rest of the
app is unaffected**, exactly like the DB and auth fallbacks. Model output
is constrained by a JSON schema and then re-validated by the pure
`lib/core/ai` normalizers before it's trusted.

**Deliberately parked** (spec §17/§18): the character accessory/unlock
*economy* (needs monetization) and everything in the spec's Non-Goals.
That completes the spec's Phase 1–3 scope.

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
- **No AI key needed** — without `ANTHROPIC_API_KEY`, the Phase 3 AI
  assists (receipt scan, brainstorm) render disabled with an explanatory
  label and everything else works. Set the key to turn them on (calls
  cost money when used).

### Checks

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # Vitest — schedule/verification/streak/finance/ideas/tutorials/cosmetics/autofill/ai
npm run test:e2e   # Playwright — the loop, four hubs, month view, auto-plan, AI (mock GitHub + Claude)
```

The e2e suite boots its own dev server (own `.next-e2e` dist + `.pglite-e2e`
database) so it runs fine alongside your dev server, and proves both
verification outcomes: *no commit → task refuses to check* and *real commit →
auto-check + grid lights up*.

## Architecture

```
app/                    Next.js App Router routes (thin — screens only)
components/             UI components (character, grids, blobs, forms)
lib/core/               framework-agnostic logic: schedule generation, commit
                        verification, streak/finance/autofill math, AI-output
                        validation, dates
lib/server/             server layer: session→user, day-state assembly,
                        rollups, sync service, the Claude seam, server actions
lib/db/                 Drizzle schema, driver switch (Neon ⇄ PGlite),
                        generated SQL migrations
tests/unit/             Vitest against lib/core
tests/e2e/              Playwright + mock GitHub events / mock Claude servers
```

Design decisions worth knowing:

- **`lib/core` is pure.** Schedule generation, commit verification, and all
  finance math (periods, bucketing, Sankey flows) are deterministic
  functions with no framework or DB imports — a future native client hits
  the same logic through the API layer (spec §1.4).
- **Money is integer cents and never logged.** `FinanceEntry` amounts are
  treated as real personal financial data from day one (CLAUDE.md rule):
  no floats, no amounts in console/analytics output. When spending
  exceeds income the Sankey shows an explicit deficit rather than a
  negative net.
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
- **AI is optional and never trusted blind.** One seam (`lib/server/
  claude.ts`) owns the SDK, the model constant, and the `ANTHROPIC_API_KEY`
  gate; the model is constrained to a JSON schema, and its output is then
  re-validated by pure `lib/core/ai` normalizers with the same rules as
  manual entry. `ANTHROPIC_BASE_URL` is overridable **only** so tests can
  run a mock server (same pattern as `GITHUB_API_URL`).

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

The character is **pre-rendered cinematic art with a live 2.5D layer**
(v3 — after honestly concluding that real-time browser 3D could not reach
the Pixar-grade bar this product's emotional core demands). Six offline-
render-quality portraits — idle, flourish, celebrate, slump, wink, and a
hands-in-pockets rest — are cross-faded by a spring state machine, with
life composited on top in real time: a breathing loop, pointer parallax
with depth (the blurred backdrop drifts slower than the figure), an idle
fidget he settles into every few seconds, and a wink when you tap him or
when a commit gets verified. Source art lives outside the repo; a small
pipeline script (scripts/prepare-character.py) erases watermarks and emits
the ~30KB WebP each state ships as. The whole three.js stack is gone —
the hero is now ~190KB of images and a few springs.

The daily "1/3" is an Apple-Fitness-style ring; the week strip under the
portrait carries the same completion levels; the Schedule is iOS day
cards with a bottom-sheet regenerate flow instead of a data table. The
Phase 2 hubs speak the same language: no chart library (Finance's bars,
breakdown, and Sankey are divs, springs, and one hand-drawn SVG), and
Customize re-lights this very portrait with a gallery-lighting wash
rather than a 3D scene.

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
