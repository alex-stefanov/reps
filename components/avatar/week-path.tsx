"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneDay } from "@/lib/server/home-view";

/**
 * The week as a clay diorama — a floating island with seven stepping
 * stones curving across it, the character on today's. A fully completed
 * day plants a little green flag; a broken day is a sunken, tilted slab;
 * today breathes light through a glow ring. Decor is deterministic and
 * cheap (spheres only) so the scene stays at full frame rate.
 */

const STEP = 0.6;
const LEVEL_COLORS = ["#e9eaf0", "#c3f0d0", "#8ce4a8", "#52d67c", "#30d158"];

/** Gentle S-curve so the path reads as a journey, not a ruler. */
function tileOffset(i: number): { z: number; rot: number } {
  return { z: Math.sin(i * 1.05) * 0.22, rot: Math.sin(i * 2.3) * 0.12 };
}

function clay(color: string, roughness = 0.65) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.02,
    sheen: 0.3,
    sheenColor: new THREE.Color("#ffffff"),
    sheenRoughness: 0.7,
  });
}

function Flag({ x, z }: { x: number; z: number }) {
  const mats = useMemo(
    () => ({ pole: clay("#1d1e23", 0.4), pennant: clay("#30d158", 0.45) }),
    [],
  );
  return (
    <group position={[x, 0, z]}>
      <mesh material={mats.pole} position={[0.2, 0.16, -0.16]}>
        <cylinderGeometry args={[0.011, 0.011, 0.3, 8]} />
      </mesh>
      <mesh
        material={mats.pennant}
        position={[0.245, 0.27, -0.16]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <coneGeometry args={[0.045, 0.11, 4]} />
      </mesh>
    </group>
  );
}

function Bush({
  x,
  z,
  scale = 1,
  tone = "#7fce8f",
}: {
  x: number;
  z: number;
  scale?: number;
  tone?: string;
}) {
  const mat = useMemo(() => clay(tone, 0.8), [tone]);
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh material={mat} position={[0, 0.07, 0]} castShadow>
        <sphereGeometry args={[0.11, 14, 14]} />
      </mesh>
      <mesh material={mat} position={[0.09, 0.05, 0.03]}>
        <sphereGeometry args={[0.075, 12, 12]} />
      </mesh>
      <mesh material={mat} position={[-0.08, 0.045, -0.02]}>
        <sphereGeometry args={[0.065, 12, 12]} />
      </mesh>
    </group>
  );
}

function Rock({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const mat = useMemo(() => clay("#d9d6d0", 0.9), []);
  return (
    <mesh
      material={mat}
      position={[x, 0.035 * scale, z]}
      scale={[scale, scale * 0.7, scale * 0.85]}
      rotation={[0, 1.1, 0]}
    >
      <sphereGeometry args={[0.09, 10, 10]} />
    </mesh>
  );
}

type PathDay = SceneDay & { dayIndex?: number };

function Tile({ day, x }: { day: PathDay; x: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const { z, rot } = tileOffset(day.dayIndex ?? 0);

  const color = day.broken
    ? "#4a4d55"
    : day.isFuture
      ? "#e9eaf0"
      : LEVEL_COLORS[Math.min(day.level, 4)];

  useFrame(({ clock }) => {
    if (!mat.current || !day.isToday) return;
    const base = day.level > 0 ? 0.45 : 0.1;
    mat.current.emissiveIntensity = base + Math.sin(clock.elapsedTime * 2.2) * 0.09;
  });

  return (
    <group
      position={[x, day.broken ? -0.085 : 0, z]}
      rotation={[day.broken ? 0.06 : 0, rot, day.broken ? -0.05 : 0]}
    >
      {/* stepping stone: slightly conical cylinder reads as hand-formed clay */}
      <mesh position={[0, -0.065, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.29, 0.33, 0.13, 28]} />
        <meshPhysicalMaterial
          ref={mat}
          color={color}
          emissive={day.isToday ? "#30d158" : day.level > 0 && !day.broken ? color : "#000000"}
          emissiveIntensity={day.isToday ? 0.2 : day.level > 0 && !day.broken ? 0.16 : 0}
          roughness={0.65}
          clearcoat={0.15}
          clearcoatRoughness={0.5}
        />
      </mesh>
      {day.isToday && <GlowRing />}
      {day.complete && !day.broken && <Flag x={0} z={0} />}
    </group>
  );
}

function GlowRing() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) {
      // Peaks above the bloom threshold so the ring gets a soft halo.
      mat.current.emissiveIntensity = 1.6 + Math.sin(clock.elapsedTime * 2.2) * 0.6;
      mat.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 2.2) * 0.2;
    }
  });
  return (
    <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.36, 0.014, 8, 40]} />
      <meshStandardMaterial
        ref={mat}
        color="#30d158"
        emissive="#30d158"
        emissiveIntensity={0.8}
        transparent
        roughness={0.3}
      />
    </mesh>
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
  const islandMat = useMemo(() => clay("#e3efdc", 0.85), []);
  const islandRimMat = useMemo(() => clay("#cfe0c6", 0.9), []);
  const todayOffset = tileOffset(centered);

  return (
    <group position={[0, 0, -todayOffset.z]}>
      {/* the floating island — a soft mound whose top sits just under the
          stepping stones, edges peeking into frame for the diorama feel */}
      <group position={[0, -0.29, 0]}>
        <mesh material={islandMat} scale={[1, 0.135, 0.52]} receiveShadow>
          <sphereGeometry args={[1.9, 36, 24]} />
        </mesh>
        <mesh material={islandRimMat} position={[0, -0.12, 0]} scale={[0.96, 0.2, 0.48]}>
          <sphereGeometry args={[1.85, 28, 20]} />
        </mesh>
      </group>

      {/* stepping stones, today under the character */}
      <group position={[-centered * STEP, 0, 0]}>
        {week.map((day, i) => (
          <Tile key={day.date} day={{ ...day, dayIndex: i }} x={i * STEP} />
        ))}
      </group>

      {/* deterministic decor, kept off the path line */}
      <Bush x={-1.3} z={0.55} scale={1.05} />
      <Bush x={1.45} z={0.42} scale={0.85} tone="#5db974" />
      <Bush x={0.75} z={-0.55} scale={0.7} />
      <Rock x={-0.8} z={-0.5} scale={1.0} />
      <Rock x={1.15} z={-0.42} scale={0.65} />
      <Bush x={-1.7} z={-0.15} scale={0.6} tone="#8fd69c" />
    </group>
  );
}
