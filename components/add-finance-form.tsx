"use client";

import { motion } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { addFinanceEntry } from "@/lib/server/finance-actions";
import type { FinanceDirection } from "@/lib/core/finance";
import type { CategoryDTO } from "./finance-screen";

const NEW_TYPE = "__new__";

/**
 * Add Finance (spec §7.2): Income ‹› Spending carousel, big amount field,
 * type dropdown that can insert a new one. Built to beat the spec's
 * 20-second time-to-log bar — amount is auto-focused, today is preset.
 */
export function AddFinanceForm({
  categories,
  today,
}: {
  categories: CategoryDTO[];
  today: string;
}) {
  const [direction, setDirection] = useState<FinanceDirection>("spending");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = useMemo(
    () => categories.filter((c) => c.kind === direction),
    [categories, direction],
  );
  const selected = categoryId || options[0]?.id || NEW_TYPE;
  const isNew = selected === NEW_TYPE;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addFinanceEntry({
        direction,
        amount,
        categoryId: isNew ? null : selected,
        newCategoryName: isNew ? newName : null,
        occurredOn,
      });
      // On success the action redirects; only errors return.
      if (result?.error) setError(result.error);
    });
  };

  const isIncome = direction === "income";

  return (
    <form
      action={submit}
      className="card-shadow mt-6 rounded-[2rem] bg-card p-5"
    >
      {/* Income ‹› Spending carousel */}
      <div
        role="tablist"
        aria-label="Direction"
        className="flex rounded-2xl bg-inset p-1"
      >
        {(["income", "spending"] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={direction === d}
            data-testid={`direction-${d}`}
            onClick={() => {
              setDirection(d);
              setCategoryId("");
              setNewName("");
            }}
            className={`relative flex-1 rounded-xl py-2.5 text-sm font-bold capitalize transition-colors ${
              direction === d ? "text-text" : "text-sub hover:text-text"
            }`}
          >
            {direction === d && (
              <motion.span
                layoutId="direction-pill"
                className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-hair"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span
              className={`relative ${
                direction === d
                  ? d === "income"
                    ? "text-accent-deep"
                    : "text-spend"
                  : ""
              }`}
            >
              {d}
            </span>
          </button>
        ))}
      </div>

      {/* Amount — the star of the form */}
      <label className="mt-6 block text-center">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Amount
        </span>
        <span className="mt-1 flex items-baseline justify-center gap-1">
          <span
            className={`text-2xl font-extrabold ${isIncome ? "text-accent-deep" : "text-spend"}`}
          >
            €
          </span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0"
            value={amount}
            data-testid="amount-input"
            onChange={(e) => setAmount(e.target.value)}
            className="num w-40 bg-transparent text-center text-5xl font-extrabold tracking-tight text-text placeholder:text-mute focus:outline-none"
          />
        </span>
      </label>

      {/* Type: existing dropdown or insert a new one (spec §7.2) */}
      <label className="mt-6 block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Type
        </span>
        <select
          value={selected}
          data-testid="category-select"
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-2 w-full appearance-none rounded-xl bg-inset px-3.5 py-3 text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NEW_TYPE}>+ New type…</option>
        </select>
      </label>
      {isNew && (
        <motion.input
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          placeholder={isIncome ? "e.g. Dividends" : "e.g. Education"}
          value={newName}
          maxLength={40}
          data-testid="new-category-input"
          onChange={(e) => setNewName(e.target.value)}
          className="mt-2 w-full rounded-xl bg-inset px-3.5 py-3 text-sm font-semibold text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      )}

      {/* Date — preset to today */}
      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Day
        </span>
        <input
          type="date"
          value={occurredOn}
          max={today}
          data-testid="date-input"
          onChange={(e) => e.target.value && setOccurredOn(e.target.value)}
          className="num mt-2 w-full rounded-xl bg-inset px-3.5 py-3 text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-bold text-danger">
          {error}
        </p>
      )}

      <motion.button
        type="submit"
        disabled={pending}
        whileTap={{ scale: 0.98 }}
        data-testid="add-entry-submit"
        className={`mt-6 w-full rounded-2xl py-4 text-[15px] font-extrabold text-white transition-colors disabled:opacity-60 ${
          isIncome ? "bg-accent hover:bg-accent-deep" : "bg-spend"
        }`}
      >
        {pending ? "Adding…" : `Add ${direction}`}
      </motion.button>
    </form>
  );
}
