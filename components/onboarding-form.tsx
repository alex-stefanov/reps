"use client";

import { useState } from "react";
import { completeOnboarding } from "@/lib/server/actions";

const INTENSITY_OPTIONS = [
  { value: "chill", label: "CHILL", blurb: "Keep momentum. 2 build days." },
  { value: "steady", label: "STEADY", blurb: "Real progress. 5 build days." },
  { value: "grind", label: "GRIND", blurb: "All in. 6 build days." },
] as const;

const TRACK_TOGGLES = [
  {
    name: "dailyCommitOn",
    label: "Daily GitHub commit",
    blurb: "Checks itself off only when a real public commit exists.",
  },
  {
    name: "leetcodeOn",
    label: "LeetCode",
    blurb: "Every other day, scheduled automatically.",
  },
  {
    name: "gymOn",
    label: "Gym",
    blurb: "A standing daily task you check off yourself.",
  },
] as const;

export function OnboardingForm() {
  const [hours, setHours] = useState(10);
  const [intensity, setIntensity] = useState<string>("steady");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData: FormData) => {
        // Timezone is a browser fact, stamped at submit time.
        formData.set(
          "timezone",
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        );
        await completeOnboarding(formData);
      }}
      onSubmit={() => setSubmitting(true)}
      className="mt-8 flex flex-col gap-8"
    >

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="hoursPerWeek" className="text-sm text-fg">
            Hours per week
          </label>
          <span className="num text-2xl text-phos-bright">{hours}h</span>
        </div>
        <input
          id="hoursPerWeek"
          type="range"
          name="hoursPerWeek"
          min={4}
          max={30}
          step={1}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="mt-3 w-full accent-(--color-phos)"
        />
        <div className="num mt-1 flex justify-between text-xs text-faint">
          <span>4h · easing in</span>
          <span>30h · second job</span>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm text-fg">How grindy?</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {INTENSITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer border px-3 py-3 transition-colors ${
                intensity === opt.value
                  ? "border-phos bg-raised text-phos-bright"
                  : "border-line bg-panel text-dim hover:border-line-bright"
              }`}
            >
              <input
                type="radio"
                name="intensity"
                value={opt.value}
                checked={intensity === opt.value}
                onChange={() => setIntensity(opt.value)}
                className="sr-only"
              />
              <span className="font-pixel text-[11px] tracking-wider">
                {opt.label}
              </span>
              <span className="mt-1 block text-xs leading-snug">
                {opt.blurb}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm text-fg">Standing tracks</legend>
        <div className="mt-3 divide-y divide-line border border-line">
          {TRACK_TOGGLES.map((toggle) => (
            <label
              key={toggle.name}
              className="flex cursor-pointer items-start gap-3 bg-panel px-4 py-3"
            >
              <input
                type="checkbox"
                name={toggle.name}
                defaultChecked
                className="mt-1 size-4 accent-(--color-phos)"
              />
              <span>
                <span className="block text-sm text-fg">{toggle.label}</span>
                <span className="block text-xs leading-snug text-dim">
                  {toggle.blurb}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="border border-phos-dim bg-raised px-4 py-3 text-left text-sm font-medium text-phos-bright transition-colors hover:border-phos disabled:opacity-60 active:translate-y-px"
      >
        <span className="num mr-3">›</span>
        {submitting ? "Generating program…" : "Generate my program"}
      </button>
    </form>
  );
}
