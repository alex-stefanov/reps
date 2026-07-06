"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, useTransition } from "react";
import { distinctTags, hostLabel } from "@/lib/core/tutorials";
import {
  deleteTutorial,
  updateTutorial,
} from "@/lib/server/tutorial-actions";
import { PencilIcon } from "./icons";

export interface TutorialDTO {
  id: string;
  title: string;
  url: string;
  language: string;
  topic: string;
}

/** One chip row per filter dimension (spec §11.1); picks combine. */
function ChipRow({
  label,
  values,
  active,
  onPick,
}: {
  label: string;
  values: string[];
  active: string | null;
  onPick: (value: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Filter by ${label}`}
      className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5"
    >
      <span className="flex shrink-0 items-center text-[10px] font-extrabold uppercase tracking-wide text-mute">
        {label}
      </span>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={active === v}
          data-testid={`chip-${label}-${v}`}
          onClick={() => onPick(active === v ? null : v)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            active === v
              ? "bg-text text-card"
              : "card-shadow bg-card text-sub hover:text-text"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function TutorialsScreen({ tutorials }: { tutorials: TutorialDTO[] }) {
  const [language, setLanguage] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tags = useMemo(() => distinctTags(tutorials), [tutorials]);
  const visible = tutorials.filter(
    (t) =>
      (language === null || t.language === language) &&
      (topic === null || t.topic === topic),
  );
  const editing = tutorials.find((t) => t.id === editingId) ?? null;

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2">
        <ChipRow
          label="Language"
          values={tags.languages}
          active={language}
          onPick={setLanguage}
        />
        <ChipRow
          label="Topic"
          values={tags.topics}
          active={topic}
          onPick={setTopic}
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm font-semibold text-mute">
          {tutorials.length === 0
            ? "The shelf is empty — add the first resource."
            : "Nothing matches those filters."}
        </p>
      ) : (
        // Plain keyed list — filtering must be instant; the animation
        // budget belongs to the loop's earned moments, not a library.
        <ul className="card-shadow mt-4 divide-y divide-hair rounded-3xl bg-card">
          {visible.map((t) => (
            <li
              key={t.id}
              data-testid="tutorial-row"
              className="flex items-center gap-3 px-5 py-3.5"
            >
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="tutorial-link"
                  className="min-w-0 flex-1 active:opacity-70"
                >
                  <span className="block truncate text-[15px] font-bold text-text">
                    {t.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-inset px-2 py-0.5 text-[10px] font-extrabold text-sub">
                      {t.language}
                    </span>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-extrabold text-accent-deep">
                      {t.topic}
                    </span>
                    <span className="num text-[10px] font-semibold text-mute">
                      {hostLabel(t.url)}
                    </span>
                  </span>
                </a>
                <button
                  type="button"
                  aria-label={`Edit ${t.title}`}
                  onClick={() => setEditingId(t.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:bg-inset hover:text-text"
                >
                  <PencilIcon className="size-3.5" />
                </button>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing && (
          <>
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingId(null)}
              className="fixed inset-0 z-30 bg-text/30"
            />
            <motion.div
              role="dialog"
              aria-label={`Edit ${editing.title}`}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="card-shadow-lg fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-[2rem] bg-card p-6 pb-8"
            >
              <EditSheetBody
                key={editing.id}
                tutorial={editing}
                onClose={() => setEditingId(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditSheetBody({
  tutorial,
  onClose,
}: {
  tutorial: TutorialDTO;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(tutorial.title);
  const [url, setUrl] = useState(tutorial.url);
  const [language, setLanguage] = useState(tutorial.language);
  const [topic, setTopic] = useState(tutorial.topic);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateTutorial(tutorial.id, {
        title,
        url,
        language,
        topic,
      });
      if (result.error) setError(result.error);
      else onClose();
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteTutorial(tutorial.id);
      onClose();
    });
  };

  const field =
    "mt-2 w-full rounded-xl bg-inset px-3.5 py-3 text-sm font-semibold text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <>
      <div className="mx-auto h-1.5 w-10 rounded-full bg-hair-strong" />
      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Title
        </span>
        <input
          value={title}
          maxLength={80}
          data-testid="edit-title"
          onChange={(e) => setTitle(e.target.value)}
          className={field}
        />
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Link
        </span>
        <input
          value={url}
          inputMode="url"
          onChange={(e) => setUrl(e.target.value)}
          className={`num ${field}`}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-sub">
            Language
          </span>
          <input
            value={language}
            maxLength={24}
            onChange={(e) => setLanguage(e.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-sub">
            Topic
          </span>
          <input
            value={topic}
            maxLength={24}
            onChange={(e) => setTopic(e.target.value)}
            className={field}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          disabled={pending}
          data-testid="delete-tutorial"
          onClick={remove}
          className="flex-1 rounded-2xl bg-inset py-3.5 text-[15px] font-bold text-danger active:scale-[0.98] disabled:opacity-60"
        >
          Delete
        </button>
        <button
          type="button"
          disabled={pending}
          data-testid="save-tutorial"
          onClick={save}
          className="flex-[2] rounded-2xl bg-accent py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-accent-deep active:scale-[0.98] disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </>
  );
}
