# UI/UX & Implementation Audit

**Audited against:** `docs/PRODUCT_SPEC.md` (v3) + `README.md`; the AI integration additionally judged against the bundled `claude-api` skill (model ids, params). Where no spec clause applies, findings are labelled `[best-practice]`.
**Date:** 2026-07-08
**Readiness verdict:** Not yet flagship, but close, and the hard parts are right. The credibility mechanic (GitHub verification cannot be faked), authorization (every mutation re-checks ownership — no IDOR found), and the AI seam (correct `claude-opus-4-8` id, correct `output_config.format`, refusal handled, graceful no-key degradation) are all sound. The gaps are the surrounding polish a top-tier app is judged on: one real data-entry bug in the receipt-scan path, zero error/loading boundaries, an external API call in the Home render path with no timeout, and no reduced-motion / installable-app / focus-management story. No P0 ship-stoppers.

## Summary
- P0 (broken / blocking / security): 0
- P1 (serious UX or reliability): 3
- P2 (polish / consistency): 6
- P3 (nice-to-have): 1

## Findings

### [x] UX-001 — Receipt scan prefills an amount that fails its own validation for totals ≥ €1,000
- **Severity:** P1
- **Category:** Reliability & error handling / Interaction
- **Bar:** best-practice (the §7.4 receipt-scan feature is spec'd; this is a defect in it)
- **Location:** `components/add-finance-form.tsx:91`, `lib/core/finance.ts:250` (`formatEuros`), `lib/core/finance.ts:263` (`parseEuros`)
- **Problem:** After a successful scan, the form fills the amount field with `formatEuros(result.amountCents).replace("€", "")`. `formatEuros` uses `Intl.NumberFormat("en-IE", { style: "currency" })`, which inserts a **comma thousands separator** for values ≥ 1000 (e.g. `€1,299.00` → field value `"1,299.00"`). On submit, `parseEuros` does `.replace(",", ".")` (replaces only the first comma) → `"1.299.00"`, which fails the regex `/^\d+(\.\d{1,2})?$/` and returns `null` → the action returns `"Enter a real amount."`. So the AI succeeds, shows the user a valid-looking figure, and then rejects it with a misleading error the moment they hit Add.
- **Impact:** Receipt scanning silently dead-ends for any receipt of €1,000+ (rent, electronics, travel). The user sees a plausible amount and an "enter a real amount" error and has no idea why. Amounts under €1,000 and whole-euro amounts happen to work, which makes the bug intermittent and confusing.
- **Spec reference:** §7.4 "photo → editable {amount, semantic category} suggestion … editable before save."
- **Recommended fix:** Don't round-trip through a localized currency string. Prefill from cents directly (e.g. `(cents / 100).toFixed(2)`), or add a cents-based prefill path that bypasses `parseEuros`. Independently, make `parseEuros` robust: strip grouping separators before parsing (`replace(/,/g, "")` or Intl-aware parsing) rather than a single `.replace(",", ".")`.
- **Done when:** Scanning a receipt whose total is ≥ €1,000 prefills a value that submits without error, and a unit test covers `formatEuros`→`parseEuros` round-trips across 0.5, 12.50, 1000, and 12345.67.

### [x] UX-002 — No error, not-found, or global-error boundaries anywhere in the app
- **Severity:** P1
- **Category:** Reliability & error handling
- **Bar:** best-practice
- **Location:** `app/` (no `error.tsx`, `global-error.tsx`, or `not-found.tsx` at any level — confirmed by glob), all pages render server components that `await` DB/network work (e.g. `app/page.tsx:29`, `lib/server/home-view.ts:57`)
- **Problem:** Every screen is a server component that awaits the DB (and, on Home, the GitHub sync). Any thrown error — a DB hiccup, a Drizzle error, a null deref — propagates to the framework with no route `error.tsx`, so the user gets Next's bare default error screen with no recovery affordance and no "try again." There is no `not-found.tsx` for bad routes either.
- **Impact:** A transient failure on any screen becomes a full-page dead-end with no path back into the app. For a product whose bar is "open it every morning," a single blank error page erodes the trust the whole loop is built on.
- **Spec reference:** none (the four-states expectation — loading/empty/**error**/success — is the audit's best-practice bar).
- **Recommended fix:** Add an `app/error.tsx` (client component with a reset button) and an `app/global-error.tsx`; add `app/not-found.tsx`. Give at least Home/Finance/Schedule a friendly recover-and-retry state consistent with the Clay & Glass voice.
- **Done when:** Forcing a thrown error in a page renders a styled, recoverable error state (not Next's default), and an unknown route renders a styled 404.

### [x] UX-003 — Home render blocks on the GitHub API with no timeout / abort
- **Severity:** P1
- **Category:** Reliability & performance
- **Bar:** best-practice
- **Location:** `lib/server/home-view.ts:62` (`await syncCommitVerification(user)` in the render path), `lib/core/github-verify.ts:76` (`fetchImpl(...)` with `cache: "no-store"` and **no `AbortSignal`/timeout**)
- **Problem:** `getHomeView` awaits `syncCommitVerification`, which calls `fetch` against `api.github.com` inside the Home server-component render. The fetch has no timeout or `AbortSignal`. The `"unavailable"` fallback only triggers on an error/rejection — a *slow or hung* connection just blocks. It's throttled to once per 5 min per user, so it won't fire on every load, but when it does fire and GitHub is slow, Home's TTFB hangs until the platform (Vercel) function timeout, which surfaces as a 504 — a stuck Home screen.
- **Impact:** The primary screen's load time is coupled to GitHub's responsiveness on the first open in each 5-minute window. Worst case is a hung render, not just a slow one.
- **Spec reference:** §13 requires "sync on app open," but not synchronously in the render path with no timeout. Goal §1: "know in under 10 seconds what today's tasks are."
- **Recommended fix:** Add an `AbortSignal.timeout(~4s)` (or `Promise.race`) around the GitHub fetch and treat expiry as `"unavailable"`; consider moving the on-open sync out of the render path (client-triggered after paint, or `after()`), so Home always renders instantly and verification resolves asynchronously.
- **Done when:** Home renders within its budget even when GitHub is unreachable/slow, and a simulated hung GitHub response no longer stalls the page.

### [x] UX-004 — No `prefers-reduced-motion` handling in a motion-heavy app
- **Severity:** P2
- **Category:** Accessibility & motion
- **Bar:** best-practice
- **Location:** `app/globals.css` (no `@media (prefers-reduced-motion)` — confirmed), `components/character-portrait.tsx:165` (infinite breathing loop), `components/character-portrait.tsx:110`/`globals.css:120` (`animate-pulse-dot`, infinite), `globals.css:105` (`animate-refuse`), `components/milestone-burst.tsx`, plus pervasive framer-motion springs/parallax
- **Problem:** The product leans hard on continuous motion — a breathing character loop that never stops, pointer parallax, spring transitions on every interaction, an infinite pulsing verification dot, a shake animation, and a milestone particle burst. Nothing respects `prefers-reduced-motion`, and framer-motion's `useReducedMotion()` is not used anywhere.
- **Impact:** Users with vestibular sensitivity get continuous, unavoidable animation. This is table stakes for the "Apple-grade" bar the README claims (Apple platforms honor Reduce Motion everywhere).
- **Spec reference:** none (accessibility best-practice).
- **Recommended fix:** Gate the infinite/large motions behind `useReducedMotion()` (freeze breathing/parallax, drop the milestone burst to a static state, stop the pulse) and add a global `@media (prefers-reduced-motion: reduce)` rule that neutralizes the CSS keyframe animations.
- **Done when:** With OS Reduce Motion on, the character is static, decorative loops stop, and interactions cross-fade instead of spring — verified at runtime. `[verify-at-runtime]`
- **Verify at runtime:** yes — the rendered motion needs eyes.

### [ ] UX-005 — Missing installable-app assets and social/branding metadata
- **Severity:** P2
- **Category:** Assets & branding
- **Bar:** best-practice
- **Location:** `app/layout.tsx:10` (metadata has `title`/`description` only — no `icons`, `manifest`, `openGraph`, `appleWebApp`), `app/` contains only the default `favicon.ico` (no `manifest.webmanifest`, `apple-icon`, `icon.png`, or `opengraph-image`), `public/` holds only the six character WebPs
- **Problem:** Spec §1.4 states mobile is the expected primary surface and the app is architected to be opened every morning, yet there is no web app manifest, no `apple-touch-icon`, no maskable/PWA icons, no themed `theme-color` for an installed shell (only the light `viewport.themeColor`), and no Open Graph/social image. It ships with Next's stock favicon.
- **Impact:** "Add to Home Screen" yields a generic icon and browser-chrome shell; any shared link renders with no preview card. For a character-driven product whose emotional core is the avatar, that's a conspicuous branding miss.
- **Spec reference:** §1.4 (mobile-first, opened daily); §18 keeps installability/monetization as an architectural seam.
- **Recommended fix:** Add `app/manifest.ts` (name, short_name, theme/background color, maskable icons at 192/512), `app/apple-icon.png`, `app/icon.png`, and an `app/opengraph-image` (the idle portrait works). Wire `metadata.appleWebApp` and `metadata.openGraph`.
- **Done when:** Lighthouse PWA "installable" passes, iOS "Add to Home Screen" shows a branded icon, and a pasted link renders an OG card.

### [ ] UX-006 — Bottom-sheet dialogs have no focus management (trap, autofocus, Escape, restore)
- **Severity:** P2
- **Category:** Accessibility & interaction
- **Bar:** best-practice
- **Location:** `components/brainstorm-sheet.tsx:104` (`role="dialog"` sheet — no autofocus, no focus trap, no Escape handler, no focus restore), `components/idea-sheet.tsx` (no `Escape`/`autoFocus`/focus effect — confirmed by grep)
- **Problem:** The brainstorm and idea sheets are modal dialogs (`role="dialog"`) but manage no focus: opening doesn't move focus into the sheet, Tab is not trapped inside it (focus can wander to the page behind the scrim), Escape does not close them, and focus isn't returned to the trigger on close. The brainstorm sheet handles Enter-to-send but not Escape-to-close.
- **Impact:** Keyboard and screen-reader users can't operate the sheets predictably — the core "Brainstorm" and "Plan it / edit idea" flows are effectively mouse-only, and focus is left orphaned behind the scrim.
- **Spec reference:** none (keyboard/focus accessibility best-practice).
- **Recommended fix:** On open, focus the first field (brainstorm input) or the dialog; trap Tab within the sheet; close on Escape; restore focus to the opener on close. A small `useEffect`-based focus manager (or a headless dialog primitive) covers both sheets.
- **Done when:** Opening a sheet moves focus in, Tab cycles only within it, Escape closes it, and focus returns to the trigger — verified with keyboard only.

### [x] UX-007 — Finance has no first-run empty state
- **Severity:** P2
- **Category:** Visual & interface quality (empty state)
- **Bar:** best-practice
- **Location:** `components/finance-entries.tsx:26` (`if (entries.length === 0) return null`), `components/finance-screen.tsx` (no empty-state branch — confirmed by grep; charts/Sankey render regardless)
- **Problem:** Ideas and Tutorials seed curated content on first load, so they're never blank — but Finance starts genuinely empty. With zero entries the screen renders empty bars, an empty Sankey, and no entries list (the list returns `null`), with no "add your first entry" affordance or explanation. One of the four required states (loading/**empty**/error/success) is missing on the one hub that actually starts empty.
- **Impact:** A brand-new user's first visit to a headline hub looks broken or unfinished rather than inviting the first action.
- **Spec reference:** §7 (Finance is a P0 hub); the four-states expectation is the best-practice bar.
- **Recommended fix:** Add an explicit empty state to `finance-screen` / `finance-entries` (illustration or icon + one line + a prominent "Add your first entry" CTA), shown when the period has no entries.
- **Done when:** Opening Finance with no entries shows a purposeful empty state with a clear primary action, not empty charts.

### [x] UX-008 — No route-level loading UI for data-backed navigations
- **Severity:** P2
- **Category:** Animation & motion / perceived performance
- **Bar:** best-practice
- **Location:** `app/` (no `loading.tsx` at any level — confirmed by glob); Finance/Schedule/Ideas/Tutorials pages all `await` DB queries in their server components
- **Problem:** There are no `loading.tsx` Suspense fallbacks. Navigating to a data-backed hub shows nothing until the server work resolves, then pops in — no skeleton, no transition — which is at odds with the "spring physics on every interaction" polish the README promises.
- **Impact:** Navigations feel like blank stalls rather than instant, especially on mobile networks. `[verify-at-runtime]`
- **Spec reference:** none (perceived-performance best-practice).
- **Recommended fix:** Add `loading.tsx` skeletons for at least `/finance`, `/schedule`, `/ideas`, `/tutorials` matching each screen's card layout.
- **Done when:** Slow-network navigation to each hub shows a skeleton immediately, then content. `[verify-at-runtime]`

### [ ] UX-009 — Brainstorm agent omits adaptive thinking; AI calls set no client timeout
- **Severity:** P2
- **Category:** AI integration quality
- **Bar:** best-practice (per the `claude-api` skill)
- **Location:** `lib/server/brainstorm-actions.ts:116` (`structuredCall` — no `thinking`), `lib/server/claude.ts:44`-`63` (`structuredCall` passes no `thinking` and no request timeout; `getClaude()` uses SDK defaults)
- **Problem:** Cross-checked against the bundled `claude-api` skill, the core wiring is correct — `CLAUDE_MODEL = "claude-opus-4-8"` is the skill's mandated default, `output_config: { format: { type: "json_schema", schema } }` is the current (non-deprecated) structured-output shape, and `stop_reason === "refusal"` is handled. Two gaps remain: (1) the skill says to default to adaptive thinking "for anything remotely complicated" — the brainstorm agent (quality-sensitive idea generation, the whole point of §9.3's "valid and meaningful, never filler") runs with thinking off, since omitting `thinking` on Opus 4.8 means no thinking; (2) neither `structuredCall` nor `getClaude()` sets a per-request timeout, so a slow completion rides the SDK's 10-minute default under a spinner.
- **Impact:** Brainstorm suggestion quality is left on the table versus the skill's recommended setting; a slow model call can hang the receipt/brainstorm UI far longer than a user will wait.
- **Spec reference:** §9.3 (suggestions must be genuinely buildable, never filler). Skill: "default to adaptive thinking for anything remotely complicated."
- **Recommended fix:** Add `thinking: { type: "adaptive" }` (optionally `output_config.effort`) to the brainstorm `structuredCall`; the receipt extraction can stay thinking-off. Set a sensible per-request timeout (e.g. `client.messages.create({...}, { timeout: 30_000 })`) so failures surface promptly as the existing "agent is unavailable" error.
- **Done when:** Brainstorm calls run with adaptive thinking, and a stalled API call fails fast into the existing error branch instead of hanging on the spinner.

### [ ] UX-010 — Low-priority polish and consistency nits (grouped)
- **Severity:** P3
- **Category:** Consistency / polish
- **Bar:** best-practice
- **Location:** `components/add-finance-form.tsx:99` (`scannedRef` set to `""` on scan, then any manual edit still records `source: "receipt"` since `"" !== null`); `lib/server/receipt-actions.ts:69` (size gate `imageBase64.length > MAX_IMAGE_BYTES * 1.4` caps real files at ~5.5 MB, subtly inconsistent with the "under 5 MB" copy at `:70`); `app/layout.tsx:18` (`colorScheme: "light"` locks out dark mode — a deliberate "Clay & Glass" product decision per the README, noted only so it's a conscious choice, not an oversight); `components/brainstorm-sheet.tsx:173` static "Thinking…" label.
- **Problem:** Individually trivial: provenance can be mislabeled `receipt` after a manual override; the receipt byte-cap math and the user-facing "under 5 MB" copy disagree slightly; the app is intentionally light-only.
- **Impact:** Minor data-provenance fuzziness and copy/behavior drift; none user-blocking.
- **Spec reference:** none.
- **Recommended fix:** Clear/track `scannedRef` distinctly from merchant text so an edited entry reports the right `source`; align the receipt size check with the stated 5 MB; leave dark mode out consciously (light-only is on-brand).
- **Done when:** These are triaged; each is a one-line change or an explicit "won't fix."
