"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { IDEA_TYPE_LABELS, IDEA_TYPES, type IdeaType } from "@/lib/core/ideas";
import { addIdea } from "@/lib/server/idea-actions";

/** Add Idea (spec §9.2): Name, Type, Description, Hours → Add. */
export function AddIdeaForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState<IdeaType>("project");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addIdea({ name, type, description, hours });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form action={submit} className="card-shadow mt-6 rounded-[2rem] bg-card p-5">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Name
        </span>
        <input
          autoFocus
          value={name}
          maxLength={60}
          placeholder="Text-to-SQL IDE"
          data-testid="idea-name"
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-xl bg-inset px-3.5 py-3 text-[15px] font-bold text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold uppercase tracking-wide text-sub">
          Type
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-inset p-1">
          {IDEA_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              data-testid={`idea-type-${t}`}
              onClick={() => setType(t)}
              className={`rounded-lg py-2.5 text-center text-sm font-bold transition-colors ${
                type === t
                  ? "card-shadow bg-card text-text"
                  : "text-sub hover:text-text"
              }`}
            >
              {IDEA_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Description
        </span>
        <textarea
          value={description}
          maxLength={280}
          rows={3}
          placeholder="What is it, and why is it worth building?"
          data-testid="idea-description"
          onChange={(e) => setDescription(e.target.value)}
          className="mt-2 w-full resize-none rounded-xl bg-inset px-3.5 py-3 text-sm leading-relaxed text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <label className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={500}
          value={hours}
          placeholder="—"
          data-testid="idea-hours"
          onChange={(e) => setHours(e.target.value)}
          className="num w-24 rounded-xl bg-inset px-3.5 py-3 text-sm font-bold text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <span className="text-sm font-bold text-sub">estimated hours</span>
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
        data-testid="add-idea-submit"
        className="mt-5 w-full rounded-2xl bg-accent py-4 text-[15px] font-extrabold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add idea"}
      </motion.button>
    </form>
  );
}
