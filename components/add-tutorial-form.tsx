"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { addTutorial } from "@/lib/server/tutorial-actions";

/**
 * Add Tutorial (spec §11.2): title, link, language, topic. Existing tags
 * are offered via datalists so the shelf's vocabulary stays consistent.
 */
export function AddTutorialForm({
  languages,
  topics,
}: {
  languages: string[];
  topics: string[];
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addTutorial({ title, url, language, topic });
      if (result?.error) setError(result.error);
    });
  };

  const field =
    "mt-2 w-full rounded-xl bg-inset px-3.5 py-3 text-sm font-semibold text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <form action={submit} className="card-shadow mt-6 rounded-[2rem] bg-card p-5">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Title
        </span>
        <input
          autoFocus
          value={title}
          maxLength={80}
          placeholder="Writing an Interpreter in Go"
          data-testid="tutorial-title"
          onChange={(e) => setTitle(e.target.value)}
          className={field}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-wide text-sub">
          Link
        </span>
        <input
          value={url}
          inputMode="url"
          placeholder="https://…"
          data-testid="tutorial-url"
          onChange={(e) => setUrl(e.target.value)}
          className={`num ${field}`}
        />
      </label>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-sub">
            Language
          </span>
          <input
            value={language}
            maxLength={24}
            list="language-options"
            placeholder="Go"
            data-testid="tutorial-language"
            onChange={(e) => setLanguage(e.target.value)}
            className={field}
          />
          <datalist id="language-options">
            {languages.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-sub">
            Topic
          </span>
          <input
            value={topic}
            maxLength={24}
            list="topic-options"
            placeholder="Systems"
            data-testid="tutorial-topic"
            onChange={(e) => setTopic(e.target.value)}
            className={field}
          />
          <datalist id="topic-options">
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      </div>

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
        data-testid="add-tutorial-submit"
        className="mt-5 w-full rounded-2xl bg-accent py-4 text-[15px] font-extrabold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add to the shelf"}
      </motion.button>
    </form>
  );
}
