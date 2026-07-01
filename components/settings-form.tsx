"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "@/lib/server/actions";

const TOGGLES = [
  {
    key: "dailyCommitOn" as const,
    label: "Daily GitHub commit",
    blurb:
      "The verified task. While on, Commit appears every day and only a real public commit checks it off — no manual override.",
  },
  {
    key: "leetcodeOn" as const,
    label: "LeetCode",
    blurb:
      "Off removes LeetCode everywhere: today's tasks, Schedule columns, and stats. Back on restores it.",
  },
  {
    key: "gymOn" as const,
    label: "Gym",
    blurb: "The daily gym log. Off removes it from tasks and stats.",
  },
];

export interface SettingsValues {
  leetcodeOn: boolean;
  gymOn: boolean;
  dailyCommitOn: boolean;
  timezone: string;
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = (next: SettingsValues) => {
    setValues(next);
    setSaved(false);
    startTransition(async () => {
      await updateSettings(next);
      setSaved(true);
    });
  };

  return (
    <div className="mt-6">
      <div className="divide-y divide-line border border-line">
        {TOGGLES.map((toggle) => (
          <label
            key={toggle.key}
            className="flex cursor-pointer items-start gap-3 bg-panel px-4 py-3.5"
          >
            <input
              type="checkbox"
              checked={values[toggle.key]}
              disabled={pending}
              data-testid={`toggle-${toggle.key}`}
              onChange={(e) =>
                save({ ...values, [toggle.key]: e.target.checked })
              }
              className="mt-1 size-4 accent-(--color-phos)"
            />
            <span>
              <span className="block text-sm text-fg">{toggle.label}</span>
              <span className="block max-w-[44ch] text-xs leading-snug text-dim">
                {toggle.blurb}
              </span>
            </span>
          </label>
        ))}
      </div>

      <label className="mt-6 block text-sm text-fg">
        Timezone
        <span className="block text-xs leading-snug text-dim">
          Defines when “today” ends — the commit-verification boundary.
        </span>
        <input
          defaultValue={values.timezone}
          disabled={pending}
          onBlur={(e) => {
            if (e.target.value !== values.timezone) {
              save({ ...values, timezone: e.target.value });
            }
          }}
          placeholder="Europe/Berlin"
          className="num mt-2 w-full max-w-xs border border-line bg-panel px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-phos-dim focus:outline-none"
        />
      </label>

      <p
        role="status"
        className={`num mt-4 text-xs ${saved ? "text-phos" : "text-faint"}`}
      >
        {pending ? "saving…" : saved ? "saved — tracks updated everywhere" : " "}
      </p>
    </div>
  );
}
