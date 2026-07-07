"use client";

import { useState, useTransition } from "react";
import { AMBIANCES } from "@/lib/core/cosmetics";
import type { SceneDay } from "@/lib/server/home-view";
import { setAmbiance } from "@/lib/server/cosmetics-actions";
import { CharacterScene } from "./character-scene";
import { CheckIcon } from "./icons";

/**
 * Customize (spec §10): pick the character's gallery lighting and watch the
 * real Home portrait update live. Optimistic — the preview switches on tap,
 * the server persists in the background.
 */
export function CustomizeScreen({
  initialAmbiance,
  previewWeek,
}: {
  initialAmbiance: string;
  previewWeek: SceneDay[];
}) {
  const [ambiance, setAmbianceState] = useState(initialAmbiance);
  const [, startTransition] = useTransition();

  const pick = (id: string) => {
    setAmbianceState(id);
    startTransition(async () => {
      await setAmbiance(id);
    });
  };

  return (
    <div className="mt-6">
      {/* Live preview: the exact Home hero, in an idle, mid-week state. */}
      <CharacterScene
        week={previewWeek}
        doneCount={1}
        totalCount={3}
        streak={4}
        justLost={false}
        commitVerified={false}
        ambianceId={ambiance}
      />

      <h2 className="mt-7 px-1 text-lg font-extrabold tracking-tight text-text">
        Gallery lighting
      </h2>
      <p className="mt-1 px-1 text-sm text-sub">
        Set the light your builder stands in. More looks unlock as the
        character system grows.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {AMBIANCES.map((a) => {
          const active = a.id === ambiance;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={active}
              data-testid={`ambiance-${a.id}`}
              onClick={() => pick(a.id)}
              className={`card-shadow relative overflow-hidden rounded-3xl bg-card p-4 text-left transition-transform active:scale-[0.98] ${
                active ? "ring-2 ring-accent" : ""
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-8 shrink-0 rounded-full ring-1 ring-hair"
                  style={{ background: a.swatch }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-extrabold tracking-tight text-text">
                    {a.name}
                  </span>
                </span>
                {active && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <CheckIcon className="size-3" />
                  </span>
                )}
              </span>
              <span className="mt-2 block text-xs leading-snug text-sub">
                {a.blurb}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 border-l-2 border-hair pl-3 text-xs leading-relaxed text-mute">
        The character is pre-rendered cinematic art, so outfits and features
        arrive as portrait packs rather than sliders (spec §10). This lighting
        is the first cosmetic; the config is built to hold the rest.
      </p>
    </div>
  );
}
