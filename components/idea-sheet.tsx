"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useDialogFocus } from "@/lib/hooks/use-dialog-focus";
import { IDEA_TYPE_LABELS, IDEA_TYPES, type IdeaType } from "@/lib/core/ideas";
import {
  deleteIdea,
  placeIdeaIntoSchedule,
  updateIdea,
} from "@/lib/server/idea-actions";
import type { IdeaDTO, PlanContext } from "./ideas-screen";

/**
 * The idea, up close: edit it, delete it, or — the whole point — place it
 * into the Schedule as the Project Work for a stretch of weeks (spec §9.4).
 * The body is keyed by idea id so its form state re-primes per idea.
 */
export function IdeaSheet({
  idea,
  plan,
  onClose,
}: {
  idea: IdeaDTO | null;
  plan: PlanContext | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(idea != null, dialogRef, onClose);

  return (
    <AnimatePresence>
      {idea && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-text/30"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={idea.name}
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="card-shadow-lg fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8 focus:outline-none"
          >
            <SheetBody key={idea.id} idea={idea} plan={plan} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SheetBody({
  idea,
  plan,
  onClose,
}: {
  idea: IdeaDTO;
  plan: PlanContext | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "error" | "placed";
    text: string;
  } | null>(null);

  const [name, setName] = useState(idea.name);
  const [type, setType] = useState<IdeaType>(idea.type);
  const [description, setDescription] = useState(idea.description ?? "");
  const [hours, setHours] = useState(
    idea.hours === null ? "" : String(idea.hours),
  );
  const [startWeek, setStartWeek] = useState(plan?.currentWeekIndex ?? 0);
  const [weekCount, setWeekCount] = useState(2);

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateIdea(idea.id, {
        name,
        type,
        description,
        hours,
      });
      if (result.error) setMessage({ kind: "error", text: result.error });
      else onClose();
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteIdea(idea.id);
      onClose();
    });
  };

  const place = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await placeIdeaIntoSchedule(idea.id, startWeek, weekCount);
      if (result.error) setMessage({ kind: "error", text: result.error });
      else
        setMessage({
          kind: "placed",
          text: `Placed into ${result.placed} Project Work session${result.placed === 1 ? "" : "s"}.`,
        });
    });
  };

  const weekOptions = plan
    ? Array.from(
        { length: plan.weeks - plan.currentWeekIndex },
        (_, i) => plan.currentWeekIndex + i,
      )
    : [];

  return (
    <>
      <div className="mx-auto h-1.5 w-10 rounded-full bg-hair-strong" />

      {/* Edit in place — same fields as Add (spec §9.2) */}
      <input
        value={name}
        maxLength={60}
        data-testid="sheet-name"
        onChange={(e) => setName(e.target.value)}
        className="mt-4 w-full bg-transparent text-xl font-extrabold tracking-tight text-text focus:outline-none"
      />
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-inset p-1">
        {IDEA_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={`rounded-lg py-2 text-center text-sm font-bold transition-colors ${
              type === t
                ? "card-shadow bg-card text-text"
                : "text-sub hover:text-text"
            }`}
          >
            {IDEA_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <textarea
        value={description}
        maxLength={280}
        rows={3}
        placeholder="What is it, and why is it worth building?"
        onChange={(e) => setDescription(e.target.value)}
        className="mt-3 w-full resize-none rounded-xl bg-inset px-3.5 py-3 text-sm leading-relaxed text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <label className="mt-1 flex items-center gap-2 text-sm font-bold text-text">
        <input
          type="number"
          min={1}
          max={500}
          value={hours}
          placeholder="—"
          onChange={(e) => setHours(e.target.value)}
          className="num w-20 rounded-xl bg-inset px-3 py-2 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <span className="text-sub">estimated hours</span>
      </label>

      {/* Pool → plan (spec §9.4) */}
      {plan && (
        <div className="mt-5 rounded-2xl bg-inset p-4">
          <p className="text-sm font-extrabold tracking-tight text-text">
            Make it the Project Work
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <select
              value={startWeek}
              data-testid="place-start-week"
              onChange={(e) => setStartWeek(Number(e.target.value))}
              className="num flex-1 appearance-none rounded-xl bg-card px-3 py-2.5 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {weekOptions.map((w) => (
                <option key={w} value={w}>
                  Week {w + 1}
                  {w === plan.currentWeekIndex ? " (now)" : ""}
                </option>
              ))}
            </select>
            <select
              value={weekCount}
              data-testid="place-week-count"
              onChange={(e) => setWeekCount(Number(e.target.value))}
              className="num appearance-none rounded-xl bg-card px-3 py-2.5 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} wk{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              data-testid="place-idea"
              onClick={place}
              className="rounded-xl bg-text px-4 py-2.5 text-sm font-bold text-card active:scale-95 disabled:opacity-60"
            >
              Place
            </button>
          </div>
          {message?.kind === "placed" && (
            <p
              data-testid="place-result"
              className="mt-2.5 text-xs font-bold text-accent-deep"
            >
              {message.text}{" "}
              <Link href="/schedule" className="underline">
                See the plan
              </Link>
            </p>
          )}
        </div>
      )}

      {message?.kind === "error" && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          {message.text}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          disabled={pending}
          data-testid="delete-idea"
          onClick={remove}
          className="flex-1 rounded-2xl bg-inset py-3.5 text-[15px] font-bold text-danger active:scale-[0.98] disabled:opacity-60"
        >
          Delete
        </button>
        <button
          type="button"
          disabled={pending}
          data-testid="save-idea"
          onClick={save}
          className="flex-[2] rounded-2xl bg-accent py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-accent-deep active:scale-[0.98] disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </>
  );
}
