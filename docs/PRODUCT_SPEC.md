# Flagship App — Product Specification (v3)

> **Status:** Working draft, grounded in the seven hand-drawn screens (Home, Income, Add Finance, Ideas Pool, Add Idea, Tutorials, Schedule) and the clarifying Q&A.
> **Supersedes:** "Flagship App Spec (v2)" — the XP-and-agent-sim framing is retired. This is a character-driven personal operating system.
> **Build stance:** Build for myself first, monetize later. Web-first, architected for mobile (mobile is the expected primary surface).
> **This document is intentionally exhaustive.** v1 scope is fenced explicitly in every section; everything else is labelled P1, P2, or Parked.

---

## 1. Product Overview

### 1.1 One-paragraph definition

A character-driven personal operating system for an ambitious builder. The user runs their real life — coding, LeetCode, gym, LinkedIn, money, project ideas, learning — through a single daily loop. A plan (the **Schedule**) defines what each day should contain; the **Home** screen shows today's slice of that plan around a customizable **character**; completing real work (verified against GitHub where relevant) checks tasks off, updates a contribution grid, and drives the character's reactions and streaks. Money in/out is tracked and visualized, project ideas live in a filterable pool an AI agent can help brainstorm, and learning resources are curated in Tutorials.

### 1.2 What makes it different (the wedge)

The market has builder-grid trackers (WIP), gamified habit apps (Habitica), and money apps — but nothing unifies **a planned engineering-career roadmap + real task verification + money + an idea pipeline + a character you personalize**, aimed at one person trying to become a "real software engineer." The differentiators that matter:

- **The plan is the product.** Most trackers ask "what did you do today?" This one starts from "here's what today *should* be," generated from how hard the user wants to grind, then tracks adherence.
- **Verification, not vibes.** The daily commit task only checks off if there's a real public GitHub commit — the app refuses to let the user lie to themselves. (Toggleable, because daily committing isn't everyone's goal.)
- **A character with stakes.** Not cosmetic XP bars — an avatar that reacts to milestones, streaks, and broken streaks, and that the user personalizes and dresses over time.
- **Money framed as growth.** The finance section is about tracking income growth and where money goes, not budgeting guilt.

### 1.3 Primary user

The builder described throughout this project: a young aspiring software engineer, working a job, disciplined, gaming-literate, relocating internationally, who wants a hard visual system that proves progress. This user is the developer — user #1 — which is deliberate: the app must be usable and compelling for its own author for 30+ consecutive days before anyone else is considered.

### 1.4 Platform strategy

- **v1:** Responsive web app, phone-viewport-first. Every screen is drawn phone-shaped except the Schedule (landscape) — so the Schedule gets a dedicated wide layout while the rest are single-column mobile layouts that scale up gracefully.
- **Architecture requirement:** All business logic behind an API; the web client is one consumer. No logic locked in the browser that a future native mobile client couldn't reuse. (This is a P2 architectural-insurance requirement, not a v1 feature.)

---

## 2. Problem Statement

An ambitious builder's progress is scattered across a job, a code editor, GitHub, a banking app, a notes app, and a vague mental plan. Nothing tells them, on a given morning, *what today should contain* to keep them on track toward a software career — and nothing verifies they actually did it rather than just ticking a box. The result: motivation runs on willpower, progress is invisible and easy to fake to oneself, and the discipline that would compound over months quietly doesn't. The cost of not solving it is the exact fear driving this whole project — drifting into "regular" without a system that makes drift visible.

---

## 3. Goals

**User goals (what the user gets):**

1. **A daily answer.** Open the app and know, in under 10 seconds, what today's tasks are and how many are done (the "1/3" at a glance).
2. **Honest progress.** Task completion reflects real work — a checked "Commit" means a real public commit exists — so the contribution grid and streaks can be trusted.
3. **One place for the whole grind.** Tasks, money, ideas, learning, and the plan live together, not in five apps.
4. **A plan that fits their energy.** The Schedule is auto-generated from how much time and intensity the user chose, then fully editable.
5. **A companion worth returning to.** The character makes the daily loop feel personal and rewarding rather than clerical.

**Builder goals (the "business," for now = the developer):**

1. **Prove the loop is sticky on myself** — 30 consecutive days of real use.
2. **Prove the hard parts work** — GitHub verification, schedule generation, receipt scan, and the finance visualizations all function on real personal data.
3. **Produce genuine portfolio + content proof** — the build itself feeds the GitHub year and the content track.
4. **Preserve a monetization path** without building paid features yet (see §12).

---

## 4. Non-Goals (explicitly out of scope for v1)

1. **Monetization features** (paywalls, tiers, billing). Build for self first; design so they're addable later. *Rationale: no proof of demand yet; premature.*
2. **Social / multiplayer** (feeds, friends, public profiles, leaderboards, shareable cards). *Rationale: not on any sketch; the product must first be compelling solo. Parked, not deleted (§13).*
3. **Native mobile app.** Web-first, mobile-architected. *Rationale: one codebase to a working loop faster; native is P2.*
4. **AI project-validation verdicts** ("will this fold or succeed"). Replaced by a lighter brainstorming agent (§9). *Rationale: the heavier "business agent" was scope the user consciously trimmed.*
5. **Social-account tracking** (followers/views). *Rationale: cut by the user for now (§13).*
6. **Region internship/junior-role matching.** *Rationale: user flagged it as under-thought; kept as an open question (§9.5, §11), not built.*
7. **General life tracking** (sleep, calendar sync, generic habits beyond the fixed tracks). *Rationale: the tracks are deliberately fixed — Code/Commit, LeetCode, Gym, LinkedIn, Money, Ideas, Learning — to keep the product sharp.*

---

## 5. The Core Daily Loop

This is the spine everything else serves. Read this before the screen specs.

```
        ┌─────────────────────────────────────────────────────┐
        │  PLAN (once, or reset anytime)                      │
        │  Login questions → auto-generated Schedule          │
        │  ("how many hours/week?", "how grindy?")            │
        └───────────────────────┬─────────────────────────────┘
                                │  today's row
                                ▼
        ┌─────────────────────────────────────────────────────┐
        │  HOME = today's slice of the Schedule               │
        │  • character (reacts to state)                      │
        │  • today's tasks (e.g. Commit, LinkedIn, LeetCode)  │
        │  • "1/3" completion + week strip + month grid       │
        └───────────────────────┬─────────────────────────────┘
                                │  user does real work
                                ▼
        ┌─────────────────────────────────────────────────────┐
        │  COMPLETE & VERIFY                                   │
        │  • mark task done (Home or Schedule)                │
        │  • "Commit" only checks if a real public GitHub     │
        │    commit is found (if the GitHub task is on)       │
        └───────────────────────┬─────────────────────────────┘
                                │  updates
                                ▼
        ┌─────────────────────────────────────────────────────┐
        │  REFLECT / REACT                                     │
        │  • contribution grid fills (week + month)           │
        │  • streaks update; character reacts to milestones   │
        │    and broken streaks                               │
        └─────────────────────────────────────────────────────┘

   Side hubs feeding the loop:  Finance (money in/out) · Ideas Pool (what to build,
   schedulable) · Tutorials (how to learn) · Customize (make the character yours)
```

**The daily commit task is special:** it is a standing daily task that is *not* part of the generated Schedule rows. It is governed by a settings toggle (like Gym and LeetCode). When on, it requires a verified public GitHub commit to check off.

---

## 6. Screen — Home ("Day X")

The daily command center. Phone layout, single column, character-centric.

### 6.1 Components (from the sketch)

- **Title:** "Day X" (the current day of the user's program) with an **Info/Questions** icon and a **Settings** icon (gear/asterisk) top-right.
- **Customize** entry (top-left, the person icon) → Character customization (§10).
- **Completion counter "1/3"** — today's checked tasks over today's total tasks. Tapping it → "view all tasks and check them" (today's task list, checkable).
- **The character** — a stick-figure/avatar in the center, personalized via Customize, reactive to state.
- **Today's task blobs** — the concrete tasks for today, pulled from today's Schedule row plus any standing daily tasks (e.g. Commit). Sketch shows Commit (green = done), Post on LinkedIn, LeetCode (pink = not done). Color encodes done/not-done.
- **Icon rail (right side)** — quick nav to: **Income/Finance**, **Gym**, **Ideas Pool**, **Tutorials**. (Gym here is a track toggle/log entry; the others open their screens.)
- **This week strip** — 7 cells, current week's daily completion (a compact contribution row).
- **This month grid** — the GitHub-style contribution graph for the month.
- **Plan button** — opens the Schedule ("personalizing schedule").

### 6.2 Where today's tasks come from

Confirmed: **Home is today's slice of the Schedule.** Today's row (BYOX work, Project work, LeetCode, LinkedIn, etc.) becomes today's task blobs. Standing daily tasks (Commit, and anything toggled on in Settings) are added on top and are not part of the Schedule rows.

### 6.3 The character's behavior

- Personalization is **cosmetic**: costumes, skins, colors, animations, accessories; an avatar built from appearance (hair, skin tone, etc.). Accessories may be **earned, bought, or otherwise unlocked** (unlock mechanics = P1; the earning economy is not v1).
- The character **reacts to state**: changes state as daily missions complete, and can react on **milestones, streaks, and lost streaks**. Exact reaction set is a design open question (§11).
- v1 minimum: at least a done/not-done state change per task and a visible streak reaction. Rich animations/accessory unlocks are P1.

### 6.4 Settings (per-track toggles)

Confirmed toggles, each turning a track/standing-task on or off: **LeetCode on/off**, **Gym on/off**, **Daily GitHub commit on/off**. When a track is off, it disappears from Home tasks, Schedule columns, and stats. (Settings is a real v1 screen, minimal.)

### 6.5 Home — Requirements

**P0**
- Render today's tasks from today's Schedule row + standing daily tasks, with done/not-done color state.
- "1/3" completion counter, live-updating; tap → today's checkable task list.
- Mark a task done from Home (mirrors Schedule completion — §8, §9-answer).
- Week strip + month contribution grid reflecting real completion/commit data.
- Character rendered with the user's chosen cosmetics; done/not-done + basic streak reaction.
- Icon rail navigation to Finance, Ideas Pool, Tutorials; Gym log entry; Plan → Schedule.
- Settings with LeetCode / Gym / Daily-commit toggles.

*Acceptance (task completion + verification):*
- Given the daily-commit task is ON, when the user marks "Commit" done but no public GitHub commit is found for today, then the task does **not** check off and the app indicates verification is pending/failed.
- Given a public commit is found for today, when the app syncs GitHub, then "Commit" checks off automatically and the grid + streak update.
- Given the user marks a non-verified task (e.g. LinkedIn) done on Home, then it reflects immediately on Home and in the Schedule's today row.

**P1**
- Character milestone/streak-loss animations; accessory unlock triggers.
- Empty/first-run state (pre-seeded example day so Home isn't blank).

**P2**
- Multiple characters / character evolution stages.

---

## 7. Screen — Finance ("Income" → treat as Finance/Money)

Confirmed: the page is **Finance/Money**, covering both income and spending; "Income" is just the Home rail label. Framing is **growth** (are we making more money over time), not budgeting.

### 7.1 Components (from the sketch)

- **Period carousel:** This week ›› This month ›› This year, plus **Custom period** analysis.
- **Total chart:** two bars — total Spending (S) vs total Income (I) for the selected period.
- **Income/Spending breakdown chart:** per-day bars across the period (M T W T F S S), driven by the same carousel; a sub-toggle switches the chart between Income and Spending views.
- **Sankey diagram:** flow of money — gross income → net income → spending categories (Food, Housing, Savings, Health, Transportation, etc.) — the "where money goes" view.
- **Add (+)** → Add Finance screen (§7.2).

### 7.2 Sub-screen — Add Finance

- **Income ‹›› Spending carousel** (same interaction pattern as the period carousel).
- **Income side:** amount (€) + **Type** + Add.
- **Spending side:** amount (€) + **Type** (dropdown of existing types *or* insert a new one) + Add.
- **OR → Scan Receipt** (spending only): camera → OCR extracts the amount and assigns a category.

### 7.3 Categories & the Sankey

Confirmed: categories can be **predefined** (Food, Housing, Savings, etc.) **and** user-added. Crucially, categorization is **semantic, not literal** — a receipt for ice cream is recorded under **Food**, not "ice cream." So there's a mapping layer from raw item/merchant → category. The Sankey is built from these categories over the selected period.

### 7.4 Finance — Requirements

**P0**
- Add income and spending entries manually: amount, type/category (spending type = existing dropdown or new), timestamp.
- Period carousel (week/month/year) + custom period; all charts respond to it.
- Total S-vs-I bar chart; per-day breakdown chart with Income/Spending sub-toggle.
- Category system: seeded defaults + user-created categories.
- Sankey diagram (income → net → categories) for the selected period.

*Acceptance:*
- Given entries exist in a period, when the user switches the carousel to "This month," then every chart and the Sankey recompute for that month.
- Given the user adds a spending entry with a new type, when they save, then that type is available in the dropdown next time and appears as a Sankey node.

**P1**
- **Receipt scan (OCR):** photo → amount + semantic category suggestion → editable before save. *(High-value but the hardest v1 item; if OCR slips, manual entry fully covers the core loop, so it's P1 not P0.)*
- Semantic mapping quality (merchant/item → category) beyond simple rules.

**P2**
- Bank/CSV import; multi-currency; recurring entries; savings-goal tracking tied to projects.

*Open question (§11):* is the daily Income/Spending data also surfaced as a Home task or purely a hub? (Sketch treats Finance as a hub, not a daily task.)

---

## 8. Screen — Schedule (the in-app roadmap)

Confirmed: this is the roadmap we built, living in-app. Landscape layout (the one non-phone frame).

### 8.1 Components (from the sketch)

- **Columns:** Day · BYOX Work + h · Project Work + h · LeetCode + h · LinkedIn + h · **Th** (daily total hours) · Note.
- **Week carousel:** W2 ‹‹ W3 ‹‹ W4; **switch to Month** view (top-right).
- **Per-cell hours edit:** tap a cell to raise/lower hours.
- **+ (bottom-left):** "mark as done (select items)" — multi-select completion.
- **Pencil (bottom-right):** edit schedule / add to schedule.
- Rows color-coded by track (matching the sheet: BYOX purple, LeetCode amber, LinkedIn blue, etc.).

### 8.2 Generation & editing

Confirmed behavior:
- **Auto-generated at login** from general onboarding questions: *how much time per week* and *how grindy*. This produces the whole plan (like the roadmap we built).
- **Re-generatable at any point** — like resetting the program, optionally with a different frequency/intensity.
- **Fully editable after generation** — the user can change every part (tasks, hours, notes), per cell.
- **Ideas connect in:** the schedule and the Ideas Pool are independent, but a pool idea can be **placed into the schedule** as the Project Work for a stretch. An **AI autofill** can populate schedule project slots based on how hard the user wants to grind (§9.4).

### 8.3 Completion feeds the loop

Confirmed: marking items done here (or on Home) feeds the Home "1/3" and the contribution grid. Home and Schedule are two views of the same underlying day state.

### 8.4 Schedule — Requirements

**P0**
- Generate a dated schedule from onboarding answers (hours/week + intensity), following the cadence rules we defined (e.g. BYOX 2–3×/week, LeetCode every other day, LinkedIn ~3×/week, adjustable).
- Week view with carousel; per-cell hours edit; per-row track coloring; daily total (Th) auto-sum.
- Mark items done (multi-select) — syncs with Home + grid.
- Edit/add rows and tasks (pencil).
- Regenerate/reset the whole schedule with new parameters, non-destructively confirmable.

*Acceptance:*
- Given onboarding answers of "10h/week, medium intensity," when the schedule generates, then each week contains the agreed cadence and daily totals stay within the chosen band.
- Given the user edits a cell's hours, when they save, then that day's Th recomputes and Home reflects it.
- Given the user marks a Schedule item done, then Home's "1/3" and the contribution grid update.

**P1**
- Month view.
- AI autofill of Project Work slots from the Ideas Pool by intensity (§9.4).
- Drag-to-reschedule.

**P2**
- Calendar export; shift/work-schedule awareness; smart re-planning when days slip.

---

## 9. Screen — Ideas Pool + Add Idea + the AI Agent

### 9.1 Ideas Pool (from the sketch)

- **Filter by Type:** BYOX / SaaS / Project.
- **Idea cards** in a grid (Idea1, Idea2, …), variable sizes.
- **Add (+)** → Add Idea.
- This is the pool we've been curating in the sheets, now native.

### 9.2 Add Idea (from the sketch)

- Fields: **Name, Type, Description, Hours** + **Add**.
- **Brainstorm (with AI Agent)** button.

### 9.3 The Brainstorm agent (confirmed shape)

Not a heavyweight validator. A **chat where an agent asks general questions to understand the field/direction**, then **suggests some ideas** the user can pick from — or tells the agent to go a different direction. Critically: **suggested ideas must be valid and meaningful** — real, buildable projects (a text-to-SQL IDE, a vector DB), never filler like "a calculator." The Tinder-style swipe from earlier is now understood as **one way to visualize/browse ideas within the brainstorming session**, not a separate feature.

Agent outputs, when the user accepts an idea, can **pre-fill the Add Idea fields** (Name/Type/Description/Hours).

### 9.4 Ideas ↔ Schedule connection

- Independent stores, connectable items.
- A pool idea can be chosen as the **Project Work** for a schedule stretch.
- **AI autofill:** optionally fills schedule project slots from the pool, scaled to the chosen grind intensity. User can always override.

### 9.5 Open — internship/role suggestions

The user wants to explore surfacing **junior/internship roles in-region** but has no confident implementation yet. **Not built.** Tracked as an open question (§11) and a parked idea (§13). Marked in-product as a "coming later / ?" placeholder at most.

### 9.6 Ideas — Requirements

**P0**
- CRUD ideas with Name/Type/Description/Hours; filter by type (BYOX/SaaS/Project).
- Seed the pool from the curated lists already built.
- Place an idea into a Schedule stretch as Project Work.

*Acceptance:*
- Given ideas exist, when the user filters by "SaaS," then only SaaS ideas show.
- Given an idea, when the user assigns it to a schedule stretch, then that stretch's Project Work references the idea.

**P1**
- Brainstorm agent chat: asks orienting questions → suggests valid, meaningful ideas → accepted idea pre-fills Add-Idea fields.
- In-session idea browsing/visualization (incl. swipe-style).
- AI autofill of schedule Project Work by intensity.

**P2**
- Idea validation/scoring; internship/role surfacing (pending a real approach).

---

## 10. Screen — Customize (Character)

### 10.1 Scope (confirmed)

Cosmetic only. Costumes, skins, colors, animations, accessories; avatar built from appearance (hair, skin color, features). Accessories may be **earned, bought, or otherwise unlocked** later — the *economy* is not v1.

### 10.2 Customize — Requirements

**P0**
- Build/edit the avatar from a base set of appearance options; persist choice; render on Home.

**P1**
- Accessory/costume/skin catalog; unlock triggers tied to milestones/streaks; character reaction/animation set.

**P2**
- Purchased cosmetics (needs monetization, §12); multiple avatars; seasonal cosmetics.

---

## 11. Screen — Tutorials

### 11.1 Components (from the sketch)

- **Filter by Type:** Language / Topic.
- **Cards:** ASP, C#, AI, … — useful YouTube video tutorials.
- A curated learning-link library, filterable.

### 11.2 Tutorials — Requirements

**P0**
- CRUD/curate tutorial entries (title, link, language, topic); filter by language/topic; open the link.
- Seed with the resources already gathered (Project-Based-Learning, Build-Your-Own-X, the from-scratch videos, etc.).

**P1**
- Mark tutorials watched/queued; associate a tutorial with an idea or schedule task.

**P2**
- In-app embedded playback; auto-suggested tutorials based on the current project.

---

## 12. Data Model (first cut)

Enough to build v1 and to keep P2 items from being designed out. Names illustrative.

- **User** — id, auth, appearance/cosmetic config, settings (leetcode_on, gym_on, daily_commit_on), onboarding params (hours_per_week, intensity), github_handle.
- **Program/Schedule** — id, user_id, generation_params, created_at; regenerable.
- **ScheduleDay** — id, program_id, date, week_index, note, total_hours (derived).
- **ScheduleTask** — id, schedule_day_id, track (BYOX | Project | LeetCode | LinkedIn | …), label, hours, status (todo/done), done_at, idea_id (nullable — links to an Idea when the Project slot is an idea).
- **StandingTask** — id, user_id, type (Commit | …), date, status, verified (bool), verification_source (github).
- **CommitVerification** — id, user_id, date, commit_found (bool), commit_ref, checked_at.
- **DayCompletion** (drives grid/streaks) — user_id, date, tasks_done, tasks_total, contribution_level.
- **Idea** — id, user_id, name, type (BYOX | SaaS | Project), description, hours, source (curated/agent/manual), created_at.
- **BrainstormSession** — id, user_id, messages, suggested_ideas (P1).
- **FinanceEntry** — id, user_id, direction (income/spending), amount, currency, category_id, occurred_at, source (manual/receipt), raw_text (nullable).
- **Category** — id, user_id (nullable for seeded defaults), name, kind (income/spending).
- **Receipt** (P1) — id, finance_entry_id, image_ref, ocr_amount, ocr_category_guess.
- **Tutorial** — id, user_id (nullable for seeded), title, url, language, topic.
- **Cosmetic / Unlock** (P1) — catalog + per-user unlock ledger.

**Key relationships that must exist in v1 architecture:** ScheduleTask.idea_id → Idea; StandingTask + ScheduleTask → DayCompletion → contribution grid; FinanceEntry → Category → Sankey; CommitVerification gates the Commit StandingTask.

---

## 13. How GitHub Verification Works (the one hard integration in v1)

- Connect the user's GitHub handle (read-only, public activity).
- On sync (app open + periodic), check for **≥1 public commit on the current date**.
- If found and the daily-commit task is ON → auto-check Commit, update grid + streak.
- If not found → Commit stays unchecked; manual override is **not** allowed while the task is ON (that's the whole point).
- If the daily-commit task is OFF → the task doesn't appear; commits may still optionally color the grid (design open question, §14).

*Acceptance is covered in §6.5. This is the single integration that must work in v1 because it's the credibility mechanic.*

---

## 14. Success Metrics

**Leading (days–weeks):**
- **Self-retention:** developer uses it 30 consecutive days (primary v1 success bar).
- **Daily-loop completion:** % of days where Home is opened and ≥1 task is marked/verified.
- **Verification integrity:** Commit task check-offs that correspond to a real commit = 100% (by construction; monitored for bugs).
- **Schedule adherence:** planned vs. completed hours per week.
- **Time-to-log finance entry:** < 20 seconds manual.

**Lagging (weeks–months):**
- Contribution grid density trend (is the month greener over time).
- Streak length distribution.
- Whether the app measurably supported the real GitHub-year + LeetCode + content goals (qualitative, tied to the roadmap).
- (Post-monetization, later) willingness to pay — not measured in v1.

**Evaluation:** review at day 7, day 30, day 90 of self-use.

---

## 15. Open Questions

Tagged by who resolves. **Blocking** = answer before building that piece; **non-blocking** = resolve during.

1. **[Design, non-blocking]** Character reaction set — exactly what happens on task-done, milestone, streak, and streak-loss? Minimum viable reactions for v1?
2. **[Design, non-blocking]** Does the contribution grid color from *verified commits only*, from *all task completion*, or both blended? (§13)
3. **[Product, non-blocking]** Is Finance purely a hub, or is a daily "log money" nudge also a Home task?
4. **[Eng, blocking for finance]** Receipt OCR approach and the semantic item→category mapping (ice-cream→Food). Which OCR? Rules vs. model for categorization?
5. **[Product, blocking for Ideas P1]** Brainstorm agent guardrails — how do we guarantee suggestions are "valid and meaningful," never filler? (Curated seed list + constrained prompting?)
6. **[Product, parked]** Internship/junior-role in-region surfacing — is there any implementation the user is comfortable with? Until then, placeholder only. (§9.5)
7. **[Eng, non-blocking]** GitHub sync cadence and handling of timezones around "today's" commit boundary.
8. **[Design, non-blocking]** Schedule Month view density on a phone vs. the landscape week view.
9. **[Product, non-blocking]** Onboarding question set that drives generation — exact questions beyond hours/week + intensity?
10. **[Eng, non-blocking]** Cosmetic unlock triggers — which milestones unlock what (when the P1 economy arrives)?

---

## 16. Phasing / Build Order

Gated by "is it usable on myself," not dates.

**Phase 1 — the loop (P0 only):** Auth + onboarding questions → schedule generation → Home (today's slice, tasks, "1/3", grid) → mark-done from Home/Schedule → GitHub commit verification → basic character render + done/streak state → Settings toggles. *Deploy, use daily.*

**Phase 2 — the hubs (P0 of each):** Finance (manual entries, charts, Sankey, categories) → Ideas Pool (CRUD, filter, seed, place-into-schedule) → Tutorials (curate, filter, seed) → Customize (base avatar).

**Phase 3 — the assists (P1):** Receipt OCR → Brainstorm agent + in-session browsing → AI schedule autofill by intensity → Schedule month view → character animations/unlocks.

**Phase 4 — later (P2 + parked):** everything in §17, plus monetization design.

---

## 17. Parked Ideas (deliberately not lost)

Good ideas set aside so they don't creep into v1 — and my honest take on which are worth losing vs. keeping.

- **Public shareable profile / weekly share-card.** *Worth keeping for later* — it's the cheapest growth loop once the app is real and you decide to go public. Parked only because v1 is solo.
- **Social-account tracking (followers/views).** *Worth losing, or deprioritizing hard.* Platform APIs are restrictive and it dilutes the "engineer OS" focus. Revisit only if the content track becomes central to the product itself.
- **Tinder-swipe as a standalone feature.** *Fold in, don't lose* — it survives as a browsing mode inside the Brainstorm session, which is the right home for it.
- **Heavyweight "will it fold or succeed" validation agent.** *Fine to lose for now.* The lighter orienting-and-suggesting agent is more useful day-to-day and far cheaper to build; validation can return as a P2 mode if you ever want it.
- **Internship/junior-role in-region matching.** *Keep as a question, not a feature.* Genuinely valuable to you personally, but with no clean data source it becomes a maintenance trap. Wait until you have a concrete approach.
- **Ranked tiers / rank names for life.** *Worth losing.* The contribution grid + streaks already deliver the progress feeling without the cringe risk to the "serious engineer" self-image; ranks would fight that.
- **Character economy (buying cosmetics).** *Keep for later* — it's a natural, non-sleazy monetization surface once there's an audience, and it reinforces the character as the emotional core.

---

## 18. Monetization Path (design-only, not built in v1)

Not in scope now, but the architecture should not preclude it. The honest read from the whole project: the app likely isn't the money on day one — the **proof and audience it builds** are — so treat future revenue as validation, not income. Natural future surfaces, in rough order of defensibility:

1. **Career-outcome features** — recruiter-ready export of the verified grid + projects; deeper AI (better idea brainstorming, a real LeetCode roadmap, LinkedIn post drafting). Career outcomes justify real pricing.
2. **Character cosmetics** — earned free vs. bought, once there's a base of users who care about the character.
3. **Lifetime early-access** — a one-time deal to validate willingness to pay after a working demo, not before.

Keep billing, entitlements, and a free/paid boundary as a **P2 architectural seam**, not a v1 feature.

---

## 19. Summary

The product is a **character-driven daily operating system** for becoming a real software engineer: a generated plan (Schedule) drives a daily command center (Home) around a personalized, reactive character; real work is verified (GitHub) before it counts; money, ideas, and learning live in dedicated hubs; and an AI agent helps turn "what should I build" into valid, scheduled projects. v1 is the loop plus the hubs' P0s, built and dogfooded solo; assists (OCR, brainstorm agent, autofill, animations) are P1; social, monetization, and role-matching are deliberately parked with a path back in. The whole thing is designed to make drift toward "regular" visible — and to make the discipline that fixes it feel like something you'd open every morning.
