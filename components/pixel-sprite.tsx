"use client";

import { useEffect, useState } from "react";

/**
 * The character (spec §6.3), as a hand-authored pixel sprite: a small hooded
 * builder rendered from ASCII frame maps into SVG rects. Frame-based like a
 * real game sprite — states swap frame sets, never just a color.
 *
 * v1 reaction set (default for spec open Q1):
 *   idle      — breathing loop with occasional blink
 *   flourish  — transient burst when a task gets checked
 *   celebrate — all of today done; arms stay up, bouncing
 *   slump     — streak just broke; head down, dimmed
 */

export type SpriteState = "idle" | "flourish" | "celebrate" | "slump";

const PALETTE: Record<string, string> = {
  H: "#2e7a41", // hood
  D: "#1e3421", // hood shading
  F: "#d9e4d2", // face
  V: "#7ade8c", // eyes / visor glow
  M: "#152018", // mouth / closed eyes
  P: "#3d4a37", // legs
  B: "#566150", // boots
  A: "#2e7a41", // arms
  h: "#254d31", // hood, dimmed (slump)
  f: "#8b9a82", // face, dimmed (slump)
};

// 14 wide × 18 tall. Space = transparent.
const IDLE_A = [
  "              ",
  "    HHHHHH    ",
  "   HHHHHHHH   ",
  "  HHDFFFFDHH  ",
  "  HHFFFFFFHH  ",
  "  HHFVFFVFHH  ",
  "  HHFFFFFFHH  ",
  "   HDFFFFDH   ",
  "    HHHHHH    ",
  "   HHHHHHHH   ",
  "  AHHHHHHHHA  ",
  "  AHHHHHHHHA  ",
  "  AHHHHHHHHA  ",
  "   PPPPPPPP   ",
  "   PP    PP   ",
  "   PP    PP   ",
  "  BBB    BBB  ",
  "              ",
];

const IDLE_B = [
  "              ",
  "              ",
  "    HHHHHH    ",
  "   HHHHHHHH   ",
  "  HHDFFFFDHH  ",
  "  HHFFFFFFHH  ",
  "  HHFVFFVFHH  ",
  "   HDFFFFDH   ",
  "    HHHHHH    ",
  "   HHHHHHHH   ",
  "  AHHHHHHHHA  ",
  "  AHHHHHHHHA  ",
  "  AHHHHHHHHA  ",
  "   PPPPPPPP   ",
  "   PP    PP   ",
  "   PP    PP   ",
  "  BBB    BBB  ",
  "              ",
];

const BLINK = IDLE_A.map((row) => row.replace("FVFFVF", "FMFFMF"));

const CHEER_A = [
  "  A        A  ",
  "  A HHHHHH A  ",
  "  AHHHHHHHHA  ",
  "  AHDFFFFDHA  ",
  "   HFFFFFFH   ",
  "   HFVFFVFH   ",
  "   HFFMMFFH   ",
  "   HDFFFFDH   ",
  "    HHHHHH    ",
  "   HHHHHHHH   ",
  "   HHHHHHHH   ",
  "   HHHHHHHH   ",
  "   HHHHHHHH   ",
  "   PPPPPPPP   ",
  "   PP    PP   ",
  "   PP    PP   ",
  "  BBB    BBB  ",
  "              ",
];

const CHEER_B = [
  " A          A ",
  " A  HHHHHH  A ",
  " AAHHHHHHHHAA ",
  "  HHDFFFFDHH  ",
  "   HFFFFFFH   ",
  "   HFVFFVFH   ",
  "   HFFMMFFH   ",
  "   HDFFFFDH   ",
  "    HHHHHH    ",
  "   HHHHHHHH   ",
  "   HHHHHHHH   ",
  "   HHHHHHHH   ",
  "   HHHHHHHH   ",
  "   PPPPPPPP   ",
  "   PP    PP   ",
  "  BBB    BBB  ",
  "              ",
  "              ",
];

const SLUMP_A = [
  "              ",
  "              ",
  "              ",
  "    hhhhhh    ",
  "   hhhhhhhh   ",
  "  hhhhhhhhhh  ",
  "  hhffffffhh  ",
  "  hhfMffMfhh  ",
  "   hffffffh   ",
  "   hhhhhhhh   ",
  "  hhhhhhhhhh  ",
  "  hhhhhhhhhh  ",
  "  hhhhhhhhhh  ",
  "   PPPPPPPP   ",
  "   PP    PP   ",
  "   PP    PP   ",
  "  BBB    BBB  ",
  "              ",
];

const FRAMES: Record<SpriteState, { maps: string[][]; ms: number }> = {
  idle: { maps: [IDLE_A, IDLE_B], ms: 950 },
  flourish: { maps: [CHEER_A, CHEER_B], ms: 180 },
  celebrate: { maps: [CHEER_A, CHEER_B], ms: 420 },
  slump: { maps: [SLUMP_A], ms: 1200 },
};

function FrameSvg({ map, className }: { map: string[]; className?: string }) {
  const rects: React.ReactNode[] = [];
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]];
      if (color) {
        rects.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />,
        );
      }
    }
  });
  return (
    <svg
      viewBox="0 0 14 18"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rects}
    </svg>
  );
}

export function PixelSprite({
  state,
  className,
}: {
  state: SpriteState;
  className?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const { maps, ms } = FRAMES[state];
    if (maps.length < 2 && state !== "idle") return;
    const interval = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(interval);
  }, [state]);

  const { maps } = FRAMES[state];
  // Idle blinks every 6th beat.
  const map =
    state === "idle" && tick % 6 === 5
      ? BLINK
      : maps[tick % maps.length];

  return (
    <div
      className={className}
      data-sprite-state={state}
      style={
        state === "slump"
          ? { filter: "saturate(0.6) brightness(0.75)" }
          : undefined
      }
    >
      <FrameSvg map={map} className="h-full w-full" />
    </div>
  );
}
