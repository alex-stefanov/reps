"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  IDEA_TYPE_LABELS,
  IDEA_TYPES,
  type IdeaType,
} from "@/lib/core/ideas";
import { IdeaSheet } from "./idea-sheet";

export interface IdeaDTO {
  id: string;
  name: string;
  type: IdeaType;
  description: string | null;
  hours: number | null;
  source: string;
}

/** Program context the Plan-it sheet needs; null when no active program. */
export interface PlanContext {
  weeks: number;
  currentWeekIndex: number;
}

/** One visual voice per type: BYOX purple, SaaS amber, Project cyan. */
export const TYPE_STYLES: Record<
  IdeaType,
  { badge: string; dot: string }
> = {
  byox: { badge: "bg-track-byox/15 text-track-byox", dot: "bg-track-byox" },
  saas: { badge: "bg-warn/15 text-warn", dot: "bg-warn" },
  project: {
    badge: "bg-track-project/15 text-track-project",
    dot: "bg-track-project",
  },
};

type Filter = "all" | IdeaType;

export function IdeasScreen({
  ideas,
  plan,
}: {
  ideas: IdeaDTO[];
  plan: PlanContext | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? ideas : ideas.filter((i) => i.type === filter)),
    [ideas, filter],
  );
  const open = ideas.find((i) => i.id === openId) ?? null;

  return (
    <div className="mt-6">
      {/* Filter by type (spec §9.1) */}
      <div
        role="tablist"
        aria-label="Filter by type"
        className="card-shadow flex rounded-2xl bg-card p-1"
      >
        {(["all", ...IDEA_TYPES] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            data-testid={`filter-${f}`}
            onClick={() => setFilter(f)}
            className={`relative flex-1 rounded-xl py-2 text-[13px] font-bold transition-colors ${
              filter === f ? "text-text" : "text-sub hover:text-text"
            }`}
          >
            {filter === f && (
              <motion.span
                layoutId="idea-filter-pill"
                className="absolute inset-0 rounded-xl bg-inset ring-1 ring-hair"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">
              {f === "all" ? "All" : IDEA_TYPE_LABELS[f]}
            </span>
          </button>
        ))}
      </div>

      {/* The pool — variable-height card grid like the sketch */}
      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm font-semibold text-mute">
          {ideas.length === 0
            ? "The pool is empty — add the first idea."
            : "Nothing of this type yet."}
        </p>
      ) : (
        <div className="mt-4 columns-2 gap-3 [column-fill:balance]">
          {visible.map((idea) => (
            <motion.button
              key={idea.id}
              type="button"
              layout
              whileTap={{ scale: 0.97 }}
              onClick={() => setOpenId(idea.id)}
              data-testid="idea-card"
              className="card-shadow mb-3 block w-full break-inside-avoid rounded-3xl bg-card p-4 text-left transition-shadow hover:card-shadow-lg"
            >
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${TYPE_STYLES[idea.type].badge}`}
              >
                {IDEA_TYPE_LABELS[idea.type]}
              </span>
              <span className="mt-2 block text-[15px] font-extrabold leading-snug tracking-tight text-text">
                {idea.name}
              </span>
              {idea.description && (
                <span className="mt-1.5 block text-xs leading-relaxed text-sub">
                  {idea.description}
                </span>
              )}
              {idea.hours !== null && (
                <span className="num mt-2.5 inline-block rounded-lg bg-inset px-2 py-0.5 text-[11px] font-bold text-sub">
                  ~{idea.hours}h
                </span>
              )}
            </motion.button>
          ))}
        </div>
      )}

      <IdeaSheet idea={open} plan={plan} onClose={() => setOpenId(null)} />
    </div>
  );
}
