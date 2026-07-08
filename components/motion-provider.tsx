"use client";

import { MotionConfig } from "framer-motion";

/**
 * App-wide motion policy. `reducedMotion="user"` makes every framer-motion
 * component honor the OS "Reduce Motion" setting automatically: transform and
 * layout animations are disabled (springs become instant), while opacity
 * cross-fades are kept — so interactions fade instead of spring. See UX-004.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
