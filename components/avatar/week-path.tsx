"use client";

import { useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneDay } from "@/lib/server/home-view";

/**
 * The week as 3D terrain — the signature idea carried into the new design.
 * Seven clay tiles; the character stands on today's. Completed days glow
 * green by level, a broken day is a sunken dark slab, future days are
 * blank porcelain. The path is offset so today sits under the character.
 */

const TILE = 0.62;
const GAP = 0.1;
const STEP = TILE + GAP;

const LEVEL_COLORS = ["#e9eaf0", "#bfefcd", "#86e2a4", "#4cd577", "#30d158"];

function Tile({ day, x }: { day: SceneDay; x: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  const { color, emissive, sunken } = useMemo(() => {
    if (day.broken) {
      return { color: "#3a3d45", emissive: "#000000", sunken: true };
    }
    if (day.isFuture) {
      return { color: "#e9eaf0", emissive: "#000000", sunken: false };
    }
    const c = LEVEL_COLORS[Math.min(day.level, 4)];
    return { color: c, emissive: day.level > 0 ? c : "#000000", sunken: false };
  }, [day.broken, day.isFuture, day.level]);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    if (day.isToday) {
      // Today's tile breathes light — brighter once work is done.
      const base = day.level > 0 ? 0.5 : 0.12;
      mat.current.emissiveIntensity =
        base + Math.sin(clock.elapsedTime * 2.2) * 0.1;
    }
  });

  return (
    <group position={[x, sunken ? -0.09 : 0, 0]}>
      <RoundedBox
        args={[TILE, 0.14, TILE]}
        radius={0.05}
        smoothness={3}
        position={[0, -0.07, 0]}
      >
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={day.isToday ? "#30d158" : emissive}
          emissiveIntensity={day.isToday ? 0.2 : day.level > 0 ? 0.18 : 0}
          roughness={0.65}
        />
      </RoundedBox>
    </group>
  );
}

export function WeekPath({
  week,
  todayIndex,
}: {
  week: SceneDay[];
  todayIndex: number;
}) {
  const centered = todayIndex >= 0 ? todayIndex : week.length - 1;
  return (
    <group position={[-centered * STEP, 0, 0]}>
      {week.map((day, i) => (
        <Tile key={day.date} day={day} x={i * STEP} />
      ))}
    </group>
  );
}
