# UX Fix Log

One line per finding resolved from `docs/ux-audit.md`.

UX-001 — Prefill scanned amount from cents (`(cents/100).toFixed(2)`) instead of round-tripping through `formatEuros`; hardened `parseEuros` to strip thousands separators; added round-trip + grouped-amount unit tests — `components/add-finance-form.tsx`, `lib/core/finance.ts`, `tests/unit/finance.test.ts` — verified ✅ (16 finance unit tests pass; typecheck/lint clean on changed files)
UX-002 — Added route error boundary (retry), global-error boundary, and styled 404, all in the Clay & Glass voice with the character portraits — `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` — verified ✅ (dev server: unknown route renders the styled 404, a thrown page renders the recoverable error state with a working Try-again; lint + full typecheck clean)
UX-003 — Capped the Home-path GitHub fetch with `AbortSignal.timeout(4s)`; expiry lands in the existing "unavailable" branch (pending, never faked). Added a deterministic hung-connection unit test — `lib/core/github-verify.ts`, `tests/unit/github-verify.test.ts` — verified ✅ (78 unit tests pass incl. the new hung-fetch case; typecheck + lint clean)
UX-007 — Added a first-run Finance empty state (CoinIcon, "Start your ledger", "Add your first entry" CTA → /finance/add) shown when the account has no entries, replacing empty charts/Sankey — `components/finance-screen.tsx`; updated the onboarding e2e to expect it — verified ✅ (6/6 finance e2e pass incl. the empty-state assertions; lint + typecheck clean)
