"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState, useTransition } from "react";
import { addFinanceEntry } from "@/lib/server/finance-actions";
import { scanReceipt } from "@/lib/server/receipt-actions";
import type { FinanceDirection } from "@/lib/core/finance";
import type { CategoryDTO } from "./finance-screen";
import { CameraIcon } from "./icons";

const NEW_TYPE = "__new__";

/** Strips the "data:image/…;base64," prefix a FileReader data URL carries. */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Add Finance (spec §7.2): Income ‹› Spending carousel, big amount field,
 * type dropdown that can insert a new one. Built to beat the spec's
 * 20-second time-to-log bar — amount is auto-focused, today is preset.
 * Spending has an optional receipt scan (§7.4) that prefills the form.
 */
export function AddFinanceForm({
  categories,
  today,
  aiEnabled,
}: {
  categories: CategoryDTO[];
  today: string;
  aiEnabled: boolean;
}) {
  const [direction, setDirection] = useState<FinanceDirection>("spending");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const scannedRef = useRef(false); // did a receipt scan seed this entry?
  const merchantRef = useRef<string | null>(null); // merchant text, for rawText
  const fileRef = useRef<HTMLInputElement>(null);

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
        source: scannedRef.current ? "receipt" : "manual",
        rawText: merchantRef.current,
      });
      // On success the action redirects; only errors return.
      if (result?.error) setError(result.error);
    });
  };

  const onReceipt = async (file: File) => {
    setError(null);
    setScanNote(null);
    setScanning(true);
    try {
      const imageBase64 = await readAsBase64(file);
      const result = await scanReceipt({ imageBase64, mediaType: file.type });
      if (result.error) {
        setScanNote(result.error);
        return;
      }
      setDirection("spending");
      // Prefill from cents directly — never round-trip through a localized
      // currency string, whose comma grouping (€1,299.00) breaks parseEuros.
      if (result.amountCents != null) setAmount((result.amountCents / 100).toFixed(2));
      if (result.categoryId) {
        setCategoryId(result.categoryId);
        setNewName("");
      } else if (result.categoryName) {
        setCategoryId(NEW_TYPE);
        setNewName(result.categoryName);
      }
      scannedRef.current = true;
      merchantRef.current = result.merchant ?? null;
      setScanNote(
        `Read ${result.categoryName ?? "an entry"} — check it and add.`,
      );
    } catch {
      setScanNote("Couldn't read that image — enter it manually.");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
              // Manual direction change → this is a hand-built entry, not a scan.
              scannedRef.current = false;
              merchantRef.current = null;
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

      {/* Scan receipt (spec §7.4) — spending only */}
      {!isIncome && (
        <div className="mt-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            data-testid="receipt-input"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onReceipt(file);
            }}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={!aiEnabled || scanning}
            data-testid="scan-receipt"
            onClick={() => fileRef.current?.click()}
            title={aiEnabled ? undefined : "Set ANTHROPIC_API_KEY to enable receipt scanning"}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hair-strong py-3 text-sm font-bold text-sub transition-colors hover:border-spend hover:text-spend disabled:opacity-50 disabled:hover:border-hair-strong disabled:hover:text-sub"
          >
            <CameraIcon className="size-4.5" />
            {scanning
              ? "Reading receipt…"
              : aiEnabled
                ? "Scan a receipt"
                : "Scan a receipt (needs API key)"}
          </motion.button>
          {scanNote && (
            <p
              role="status"
              data-testid="scan-note"
              className="mt-2 text-center text-xs font-semibold text-sub"
            >
              {scanNote}
            </p>
          )}
        </div>
      )}

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
        <p
          role="alert"
          data-testid="form-error"
          className="mt-3 text-center text-sm font-bold text-danger"
        >
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
