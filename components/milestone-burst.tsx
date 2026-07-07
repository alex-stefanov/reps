"use client";

import { motion } from "framer-motion";

/**
 * A streak-milestone celebration (spec §6.3, §6.5 P1): a one-time burst of
 * sparks and a glow over the character card when a streak crosses a
 * threshold. Composited on the live 2.5D layer, in keeping with the
 * pre-rendered character — real motion, spent on a moment that earns it.
 */

const SPARKS = 16;
const COLORS = ["#30d158", "#ffd60a", "#4cd577", "#ffffff"];

export function MilestoneBurst({ streak }: { streak: number }) {
  return (
    <motion.div
      data-testid="milestone-burst"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 2.6, times: [0, 0.7, 1] }}
    >
      {/* expanding glow ring */}
      <motion.div
        className="absolute size-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(48,209,88,0.35) 0%, rgba(48,209,88,0) 70%)",
        }}
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />

      {/* radiating sparks */}
      {Array.from({ length: SPARKS }).map((_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2;
        const dist = 90 + (i % 3) * 26;
        return (
          <motion.span
            key={i}
            className="absolute size-2 rounded-full"
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: [0, 1.2, 0.4],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.02 * i }}
          />
        );
      })}

      {/* the earned number */}
      <motion.div
        className="glass card-shadow-lg relative flex flex-col items-center rounded-2xl px-5 py-3"
        initial={{ scale: 0.6, y: 8, opacity: 0 }}
        animate={{
          scale: [0.6, 1.08, 1],
          y: [8, 0, 0],
          opacity: [0, 1, 1],
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="num text-3xl font-extrabold tracking-tight text-accent-deep">
          {streak}
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-text">
          day streak
        </span>
      </motion.div>
    </motion.div>
  );
}
