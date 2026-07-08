"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, useTransition } from "react";
import { useDialogFocus } from "@/lib/hooks/use-dialog-focus";
import { IDEA_TYPE_LABELS, type IdeaType } from "@/lib/core/ideas";
import {
  brainstorm,
  type BrainstormSuggestion,
} from "@/lib/server/brainstorm-actions";
import { TYPE_STYLES } from "./ideas-screen";

/**
 * The brainstorm agent chat (spec §9.2/§9.3): the agent asks orienting
 * questions, then proposes valid, buildable ideas as pickable cards. Picking
 * one pre-fills the Add Idea form. A bottom sheet in the Clay & Glass voice.
 */

export interface AcceptedIdea {
  name: string;
  type: IdeaType;
  description: string;
  hours: string;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
  suggestions?: BrainstormSuggestion[];
}

const GREETING =
  "What are you in the mood to build? Tell me a field or a vibe — systems, a SaaS, AI, something to learn from — and I'll suggest real projects.";

export function BrainstormSheet({
  open,
  onClose,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: (idea: AcceptedIdea) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialogRef, onClose);

  const send = () => {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    setInput("");
    const nextTurns: Turn[] = [...turns, { role: "user", text }];
    setTurns(nextTurns);

    startTransition(async () => {
      const result = await brainstorm(
        nextTurns.map((t) => ({ role: t.role, text: t.text })),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setTurns((cur) => [
        ...cur,
        {
          role: "assistant",
          text: result.reply ?? "",
          suggestions: result.suggestions,
        },
      ]);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }),
      );
    });
  };

  const accept = (s: BrainstormSuggestion) => {
    onAccept({
      name: s.name,
      type: s.type,
      description: s.description ?? "",
      hours: s.hours === null ? "" : String(s.hours),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
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
            aria-label="Brainstorm with the agent"
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="card-shadow-lg fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[88dvh] max-w-md flex-col rounded-t-[2rem] bg-card focus:outline-none"
          >
            <div className="shrink-0 px-6 pt-4">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-hair-strong" />
              <h2 className="mt-3 text-lg font-extrabold tracking-tight text-text">
                Brainstorm
              </h2>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-6 py-4"
            >
              {turns.map((turn, i) => (
                <div key={i}>
                  <div
                    data-testid={`bubble-${turn.role}`}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      turn.role === "user"
                        ? "ml-auto bg-text text-card"
                        : "bg-inset text-text"
                    }`}
                  >
                    {turn.text}
                  </div>
                  {turn.suggestions && turn.suggestions.length > 0 && (
                    <div className="mt-2 grid gap-2">
                      {turn.suggestions.map((s, j) => (
                        <button
                          key={j}
                          type="button"
                          data-testid="suggestion"
                          onClick={() => accept(s)}
                          className="card-shadow rounded-2xl bg-card p-3 text-left transition-transform active:scale-[0.99]"
                        >
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${TYPE_STYLES[s.type].badge}`}
                          >
                            {IDEA_TYPE_LABELS[s.type]}
                          </span>
                          <span className="mt-1.5 block text-[14px] font-extrabold text-text">
                            {s.name}
                          </span>
                          {s.description && (
                            <span className="mt-1 block text-xs leading-relaxed text-sub">
                              {s.description}
                            </span>
                          )}
                          <span className="mt-1.5 block text-[11px] font-bold text-accent-deep">
                            Use this idea{s.hours ? ` · ~${s.hours}h` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {pending && (
                <div
                  data-testid="thinking"
                  className="w-fit rounded-2xl bg-inset px-3.5 py-2.5 text-sm text-mute"
                >
                  <span className="animate-pulse-dot">Thinking…</span>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="px-6 text-sm font-bold text-danger">
                {error}
              </p>
            )}

            <div className="shrink-0 flex items-end gap-2 border-t border-hair px-4 py-3">
              <textarea
                value={input}
                rows={1}
                placeholder="Type a direction…"
                data-testid="brainstorm-input"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="max-h-24 flex-1 resize-none rounded-xl bg-inset px-3.5 py-2.5 text-sm font-medium text-text placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button
                type="button"
                disabled={pending || input.trim() === ""}
                data-testid="brainstorm-send"
                onClick={send}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-deep active:scale-95 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
