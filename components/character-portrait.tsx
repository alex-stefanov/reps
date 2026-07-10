"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ambianceById, DEFAULT_AMBIANCE_ID } from "@/lib/core/cosmetics";

/**
 * The character as pre-rendered cinematic portraits with a live 2.5D layer —
 * the on-screen pixels are the offline-render-quality art, and the life on
 * top is real: spring cross-fades between states, a breathing loop, pointer
 * parallax with depth (the blurred backdrop moves less than the figure),
 * an idle fidget where he settles into his pockets and closes his eyes,
 * and a wink — when tapped, or when a commit gets verified.
 */

export type AvatarState = "idle" | "flourish" | "celebrate" | "slump";
type PortraitState = AvatarState | "wink" | "blink";

const PORTRAITS: Record<PortraitState, string> = {
  idle: "/character/idle.webp",
  flourish: "/character/flourish.webp",
  celebrate: "/character/celebrate.webp",
  slump: "/character/slump.webp",
  wink: "/character/wink.webp",
  blink: "/character/blink.webp",
};
const ALL_STATES = Object.keys(PORTRAITS) as PortraitState[];

const ALT: Record<PortraitState, string> = {
  idle: "Your builder, ready for today",
  flourish: "Your builder cheering a finished task",
  celebrate: "Your builder celebrating a completed day",
  slump: "Your builder, deflated after a lost streak",
  wink: "Your builder winking",
  blink: "Your builder relaxing, hands in pockets",
};

export function CharacterPortrait({
  state,
  commitVerified,
  ambianceId = DEFAULT_AMBIANCE_ID,
}: {
  state: AvatarState;
  commitVerified: boolean;
  /** Gallery lighting (Customize, spec §10) — a wash over the backdrop. */
  ambianceId?: string;
}) {
  const ambiance = ambianceById(ambianceId);
  const reduce = useReducedMotion();
  const [overlay, setOverlay] = useState<"wink" | "blink" | null>(null);
  const winkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle fidget: every so often he pockets his hands and closes his eyes.
  useEffect(() => {
    if (state !== "idle" || reduce) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = (delay: number) => {
      timer = setTimeout(() => {
        if (!alive) return;
        setOverlay((cur) => (cur === null ? "blink" : cur));
        timer = setTimeout(() => {
          if (!alive) return;
          setOverlay((cur) => (cur === "blink" ? null : cur));
          loop(6000 + Math.random() * 4000);
        }, 2000);
      }, delay);
    };
    loop(5000 + Math.random() * 3000);
    return () => {
      // Leaving idle: stop the loop and drop any lingering overlay.
      alive = false;
      clearTimeout(timer);
      setOverlay(null);
    };
  }, [state, reduce]);

  const triggerWink = () => {
    if (state !== "idle" && state !== "celebrate") return;
    setOverlay("wink");
    if (winkTimer.current) clearTimeout(winkTimer.current);
    winkTimer.current = setTimeout(() => setOverlay(null), 2100);
  };

  // Wink when the commit flips to verified while we're watching.
  const prevVerified = useRef(commitVerified);
  useEffect(() => {
    if (commitVerified && !prevVerified.current) triggerWink();
    prevVerified.current = commitVerified;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitVerified]);

  const shown: PortraitState =
    state === "idle" && overlay ? overlay : state;

  // Pointer parallax with depth: backdrop drifts less than the figure.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const fgX = useTransform(sx, (v) => v * 8);
  const fgY = useTransform(sy, (v) => v * 5);
  const bgX = useTransform(sx, (v) => v * 3);
  const tilt = useTransform(sx, (v) => v * 0.8);

  return (
    <motion.button
      type="button"
      aria-label={`${ALT[shown]} — tap to say hi`}
      className="relative block h-full w-full cursor-pointer overflow-hidden focus:outline-none"
      onClick={triggerWink}
      // Reduce Motion: no pointer parallax — the figure stays put.
      onPointerMove={
        reduce
          ? undefined
          : (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
              my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
            }
      }
      onPointerLeave={
        reduce
          ? undefined
          : () => {
              mx.set(0);
              my.set(0);
            }
      }
    >
      {/* ambient backdrop: the portrait itself, blown up and blurred */}
      <motion.div className="absolute inset-0" style={{ x: bgX }}>
        {ALL_STATES.map((s) => (
          <motion.div
            key={s}
            className="absolute -inset-4"
            initial={false}
            animate={{ opacity: shown === s ? 1 : 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Image
              src={PORTRAITS[s]}
              alt=""
              fill
              unoptimized
              draggable={false}
              className="scale-125 object-cover blur-2xl"
              priority={s === "idle"}
              sizes="480px"
            />
          </motion.div>
        ))}
        {/* gallery lighting wash (Customize) */}
        {ambiance.washOpacity > 0 && (
          <motion.div
            key={ambiance.id}
            aria-hidden
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: ambiance.washOpacity }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              background: ambiance.wash,
              mixBlendMode: ambiance.blend,
            }}
          />
        )}
      </motion.div>

      {/* the figure, breathing — frozen under Reduce Motion */}
      <motion.div
        data-testid="character-figure"
        className="absolute inset-0 origin-bottom"
        style={{ x: fgX, y: fgY, rotateZ: tilt }}
        animate={reduce ? undefined : { scaleY: [1, 1.006, 1] }}
        transition={
          reduce
            ? undefined
            : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {ALL_STATES.map((s) => (
          <motion.div
            key={s}
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity: shown === s ? 1 : 0,
              scale: shown === s ? 1 : 1.02,
              y: shown === s && s === "slump" ? 3 : 0,
            }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
          >
            <Image
              src={PORTRAITS[s]}
              alt={shown === s ? ALT[s] : ""}
              fill
              unoptimized
              draggable={false}
              className="object-contain [mask-image:linear-gradient(90deg,transparent,black_7%,black_93%,transparent)]"
              priority={s === "idle"}
              sizes="480px"
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.button>
  );
}
