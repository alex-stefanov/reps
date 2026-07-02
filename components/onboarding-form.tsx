"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { completeOnboarding } from "@/lib/server/actions";

const INTENSITY_OPTIONS = [
  { value: "chill", label: "Chill", blurb: "Keep momentum · 2 build days" },
  { value: "steady", label: "Steady", blurb: "Real progress · 5 build days" },
  { value: "grind", label: "Grind", blurb: "All in · 6 build days" },
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
      className="mt-8 flex flex-col gap-6"
    >
      <div className="card-shadow rounded-3xl bg-card p-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="hoursPerWeek" className="text-sm font-bold text-text">
            Hours per week
          </label>
          <span className="num text-3xl font-extrabold text-accent-deep">
            {hours}h
          </span>
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
          className="mt-4 w-full accent-(--color-accent)"
        />
        <div className="num mt-1.5 flex justify-between text-xs font-semibold text-mute">
          <span>4h · easing in</span>
          <span>30h · second job</span>
        </div>
      </div>

      <fieldset className="card-shadow rounded-3xl bg-card p-5">
        <legend className="sr-only">How grindy?</legend>
        <p className="text-sm font-bold text-text">How grindy?</p>
        <div className="mt-3 flex flex-col gap-2">
          {INTENSITY_OPTIONS.map((opt) => (
            <motion.label
              key={opt.value}
              whileTap={{ scale: 0.98 }}
              className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 px-4 py-3 transition-colors ${
                intensity === opt.value
                  ? "border-accent bg-accent-soft"
                  : "border-hair bg-card hover:border-hair-strong"
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
              <span>
                <span className="block text-[15px] font-bold text-text">
                  {opt.label}
                </span>
                <span className="block text-xs font-medium text-sub">
                  {opt.blurb}
                </span>
              </span>
              <span
                className={`flex size-6 items-center justify-center rounded-full border-2 ${
                  intensity === opt.value
                    ? "border-accent bg-accent"
                    : "border-hair-strong"
                }`}
              >
                {intensity === opt.value && (
                  <span className="size-2 rounded-full bg-white" />
                )}
              </span>
            </motion.label>
          ))}
        </div>
      </fieldset>

      <fieldset className="card-shadow divide-y divide-hair rounded-3xl bg-card">
        <legend className="sr-only">Standing tracks</legend>
        {TRACK_TOGGLES.map((toggle) => (
          <label
            key={toggle.name}
            className="flex cursor-pointer items-center gap-3 px-5 py-4"
          >
            <span className="flex-1">
              <span className="block text-[15px] font-bold text-text">
                {toggle.label}
              </span>
              <span className="block text-xs leading-snug text-sub">
                {toggle.blurb}
              </span>
            </span>
            <input type="checkbox" name={toggle.name} defaultChecked className="ios-switch" />
          </label>
        ))}
      </fieldset>

      <motion.button
        type="submit"
        disabled={submitting}
        whileTap={{ scale: 0.98 }}
        className="card-shadow rounded-2xl bg-text py-4 text-[15px] font-bold text-card disabled:opacity-60"
      >
        {submitting ? "Generating program…" : "Generate my program"}
      </motion.button>
    </form>
  );
}
