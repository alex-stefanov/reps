"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTransition } from "react";
import { formatEuros } from "@/lib/core/finance";
import { deleteFinanceEntry } from "@/lib/server/finance-actions";
import type { EntryDTO } from "./finance-screen";
import { XIcon } from "./icons";

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${Number(d)} ${"JanFebMarAprMayJunJulAugSepOctNovDec".slice((m - 1) * 3, m * 3)}`;
}

/** The period's raw entries, newest first — also the undo surface. */
export function FinanceEntryList({
  entries,
  names,
  colors,
}: {
  entries: EntryDTO[];
  names: Map<string, string>;
  colors: Map<string, string>;
}) {
  const [, startTransition] = useTransition();
  if (entries.length === 0) return null;

  return (
    <div className="card-shadow rounded-3xl bg-card">
      <h2 className="px-5 pb-1 pt-4 text-[15px] font-extrabold tracking-tight text-text">
        Entries
      </h2>
      <ul className="max-h-72 divide-y divide-hair overflow-y-auto pb-2">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.li
              key={e.id}
              layout
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              data-testid="finance-entry"
              className="flex items-center gap-3 px-5 py-2.5"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: colors.get(e.categoryId) ?? "#a6a8b0" }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-text">
                  {names.get(e.categoryId) ?? "—"}
                </span>
                <span className="num block text-[11px] font-semibold text-mute">
                  {shortDate(e.occurredOn)}
                </span>
              </span>
              <span
                className={`num text-[14px] font-extrabold ${
                  e.direction === "income" ? "text-accent-deep" : "text-text"
                }`}
              >
                {e.direction === "income"
                  ? formatEuros(e.amountCents, { sign: true })
                  : formatEuros(-e.amountCents)}
              </span>
              <button
                aria-label="Delete entry"
                onClick={() =>
                  startTransition(async () => {
                    await deleteFinanceEntry(e.id);
                  })
                }
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:bg-inset hover:text-danger"
              >
                <XIcon className="size-3" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
