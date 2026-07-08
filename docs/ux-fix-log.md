# UX Fix Log

One line per finding resolved from `docs/ux-audit.md`.

UX-001 — Prefill scanned amount from cents (`(cents/100).toFixed(2)`) instead of round-tripping through `formatEuros`; hardened `parseEuros` to strip thousands separators; added round-trip + grouped-amount unit tests — `components/add-finance-form.tsx`, `lib/core/finance.ts`, `tests/unit/finance.test.ts` — verified ✅ (16 finance unit tests pass; typecheck/lint clean on changed files)
