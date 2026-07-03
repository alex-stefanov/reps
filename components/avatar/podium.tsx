"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneDay } from "@/lib/server/home-view";

/**
 * The Podium — progress as a character display stand, not a hiking trail:
 *  - a porcelain pedestal, like a collectible-figure base
 *  - a progress arc around its rim that fills clockwise as today's tasks
 *    complete (the 3D twin of the completion ring)
 *  - the week as seven orbs floating in a halo arc behind the character:
 *    solid green = completed day, tinted = partial, dark = missed,
 *    frosted glass = future, today pulses and sits larger
 */

const ORB_RADIUS = 1.18;
const LEVEL_TINTS = ["#e9eaf0", "#bfe9cc", "#8ce4a8", "#52d67c", "#30d158"];

function porcelain(color: string, roughness = 0.5) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.02,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
  });
}

function ProgressArc({ ratio }: { ratio: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const arc = Math.max(ratio, 0.002) * Math.PI * 2;

  useFrame(({ clock }) => {
    if (mat.current) {
      mat.current.emissiveIntensity =
        1.1 + Math.sin(clock.elapsedTime * 2.2) * 0.25;
    }
  });

  return (
    <group rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      {/* track */}
      <mesh>
        <torusGeometry args={[0.74, 0.018, 10, 64]} />
        <meshPhysicalMaterial color="#dfe3ea" roughness={0.6} />
      </mesh>
      {/* fill — starts at the front, sweeps clockwise */}
      <mesh key={arc.toFixed(3)} scale={[1, -1, 1]}>
        <torusGeometry args={[0.74, 0.026, 12, 72, arc]} />
        <meshStandardMaterial
          ref={mat}
          color="#30d158"
          emissive="#30d158"
          emissiveIntensity={1.1}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

function DayOrb({ day, index }: { day: SceneDay; index: number }) {
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const group = useRef<THREE.Group>(null);

  // Halo arc behind the character: azimuth spread across the back half,
  // gently rising toward the middle.
  const { position, radius } = useMemo(() => {
    const a = THREE.MathUtils.degToRad(-118 + (236 / 6) * index);
    const y = 1.42 + Math.sin((index / 6) * Math.PI) * 0.22;
    return {
      position: new THREE.Vector3(
        Math.sin(a) * ORB_RADIUS,
        y,
        -Math.cos(a) * ORB_RADIUS,
      ),
      radius: day.isToday ? 0.095 : 0.068,
    };
  }, [index, day.isToday]);

  const look = useMemo(() => {
    if (day.broken) {
      return { color: "#43464f", emissive: "#000000", intensity: 0, opacity: 1 };
    }
    if (day.isFuture) {
      return { color: "#ffffff", emissive: "#000000", intensity: 0, opacity: 0.28 };
    }
    const tint = LEVEL_TINTS[Math.min(day.level, 4)];
    return {
      color: tint,
      emissive: day.level > 0 ? tint : "#000000",
      intensity: day.level > 0 ? 0.55 : 0,
      opacity: 1,
    };
  }, [day.broken, day.isFuture, day.level]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Everyone bobs a little; today breathes light too.
    if (group.current) {
      group.current.position.y =
        position.y + Math.sin(t * 1.3 + index * 0.9) * 0.03;
    }
    if (mat.current && day.isToday) {
      mat.current.emissiveIntensity =
        (day.level > 0 ? 0.9 : 0.35) + Math.sin(t * 2.4) * 0.2;
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh castShadow={!day.isFuture}>
        <sphereGeometry args={[radius, 26, 26]} />
        <meshPhysicalMaterial
          ref={mat}
          color={look.color}
          emissive={day.isToday ? "#30d158" : look.emissive}
          emissiveIntensity={day.isToday ? 0.5 : look.intensity}
          roughness={day.isFuture ? 0.15 : 0.4}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          transparent={day.isFuture}
          opacity={look.opacity}
        />
      </mesh>
    </group>
  );
}

export function Podium({
  week,
  doneRatio,
}: {
  week: SceneDay[];
  doneRatio: number;
}) {
  const top = useMemo(() => porcelain("#f4f5f8", 0.45), []);
  const side = useMemo(() => porcelain("#e6e9ef", 0.55), []);
  const base = useMemo(() => porcelain("#dfe3ea", 0.6), []);

  return (
    <group>
      {/* pedestal: two clean tiers */}
      <mesh material={top} position={[0, -0.045, 0]} receiveShadow>
        <cylinderGeometry args={[0.85, 0.88, 0.09, 64]} />
      </mesh>
      <mesh material={side} position={[0, -0.13, 0]} receiveShadow>
        <cylinderGeometry args={[0.88, 0.95, 0.09, 64]} />
      </mesh>
      <mesh material={base} position={[0, -0.22, 0]} receiveShadow>
        <cylinderGeometry args={[1.02, 1.06, 0.1, 64]} />
      </mesh>

      {/* today's completion, wrapped around the stand */}
      <group position={[0, 0.012, 0]}>
        <ProgressArc ratio={doneRatio} />
      </group>

      {/* the week as a floating halo behind the character */}
      {week.map((day, i) => (
        <DayOrb key={day.date} day={day} index={i} />
      ))}
    </group>
  );
}
