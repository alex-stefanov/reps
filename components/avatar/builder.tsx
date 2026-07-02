"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The Builder — Reps' character (spec §6.3), sculpted procedurally so the
 * design is entirely ours: a friendly matte-clay person in the brand-green
 * hoodie with headphones on, mid grind session.
 *
 * The rig is a nested-group skeleton posed by damped targets per state,
 * with procedural life layered on top (breathing, weight shift, blinking,
 * celebration bounce). States are real poses, never a color swap:
 *   idle      — breathing, subtle sway, occasional blink
 *   flourish  — transient arms-up burst when a task gets checked
 *   celebrate — sustained arms-up bounce when today is complete
 *   slump     — shoulders collapse, head drops when a streak just broke
 */

export type AvatarState = "idle" | "flourish" | "celebrate" | "slump";

const CLAY = {
  hoodie: "#2fbf63",
  hoodieDark: "#27a854",
  joggers: "#2b2d33",
  sneaker: "#f4f4f6",
  skin: "#f2c094",
  blush: "#eda17c",
  hair: "#2e2419",
  ink: "#17181c",
  accent: "#30d158",
};

interface PoseTargets {
  spineX: number;
  headX: number;
  headY: number;
  shoulderZ: number; // symmetric raise: 0 = hanging, ~2.7 = overhead
  shoulderX: number; // forward droop
  elbowX: number;
  rootY: number;
  eyesY: number; // eye scale Y (happy squint < 1)
  mouthX: number; // mouth scale X (smile > 1)
}

const POSES: Record<AvatarState, PoseTargets> = {
  idle: {
    spineX: 0.03,
    headX: 0,
    headY: 0,
    shoulderZ: 0.17,
    shoulderX: 0.06,
    elbowX: 0.22,
    rootY: 0,
    eyesY: 1,
    mouthX: 1,
  },
  flourish: {
    spineX: -0.1,
    headX: -0.18,
    headY: 0,
    shoulderZ: 2.75,
    shoulderX: 0,
    elbowX: 0.25,
    rootY: 0,
    eyesY: 0.5,
    mouthX: 1.8,
  },
  celebrate: {
    spineX: -0.08,
    headX: -0.14,
    headY: 0,
    shoulderZ: 2.6,
    shoulderX: 0,
    elbowX: 0.3,
    rootY: 0,
    eyesY: 0.5,
    mouthX: 1.7,
  },
  slump: {
    spineX: 0.4,
    headX: 0.52,
    headY: 0.12,
    shoulderZ: 0.04,
    shoulderX: 0.3,
    elbowX: 0.08,
    rootY: -0.05,
    eyesY: 0.75,
    mouthX: 0.55,
  },
};

function useClay(color: string, roughness = 0.55) {
  return useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 }),
    [color, roughness],
  );
}

function Arm({
  side,
  groupRef,
  elbowRef,
  hoodie,
  skin,
}: {
  side: 1 | -1;
  groupRef: React.RefObject<THREE.Group | null>;
  elbowRef: React.RefObject<THREE.Group | null>;
  hoodie: THREE.Material;
  skin: THREE.Material;
}) {
  return (
    // Local to the spine group (origin at the hips): shoulders sit at
    // world ~1.33 = hips 0.85 + 0.48.
    <group ref={groupRef} position={[side * 0.3, 0.48, 0]}>
      {/* upper arm */}
      <mesh material={hoodie} position={[0, -0.14, 0]}>
        <capsuleGeometry args={[0.072, 0.2, 6, 16]} />
      </mesh>
      <group ref={elbowRef} position={[0, -0.29, 0]}>
        {/* forearm */}
        <mesh material={hoodie} position={[0, -0.11, 0]}>
          <capsuleGeometry args={[0.06, 0.16, 6, 16]} />
        </mesh>
        {/* hand */}
        <mesh material={skin} position={[0, -0.25, 0]}>
          <sphereGeometry args={[0.068, 20, 20]} />
        </mesh>
      </group>
    </group>
  );
}

export function Builder({ state }: { state: AvatarState }) {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lSh = useRef<THREE.Group>(null);
  const rSh = useRef<THREE.Group>(null);
  const lEl = useRef<THREE.Group>(null);
  const rEl = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Mesh>(null);
  const lEye = useRef<THREE.Mesh>(null);
  const rEye = useRef<THREE.Mesh>(null);
  const mouth = useRef<THREE.Mesh>(null);

  const blink = useRef({ next: 2.4, until: 0 });

  const hoodie = useClay(CLAY.hoodie);
  const hoodieDark = useClay(CLAY.hoodieDark, 0.6);
  const joggers = useClay(CLAY.joggers, 0.7);
  const sneaker = useClay(CLAY.sneaker, 0.4);
  const skin = useClay(CLAY.skin, 0.6);
  const blush = useClay(CLAY.blush, 0.8);
  const hair = useClay(CLAY.hair, 0.75);
  const ink = useClay(CLAY.ink, 0.35);
  const accent = useClay(CLAY.accent, 0.4);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const pose = POSES[state];
    const d = (cur: number, target: number, lambda = 7) =>
      THREE.MathUtils.damp(cur, target, lambda, delta);

    const energetic = state === "celebrate" || state === "flourish";
    // Bounce + wave overlays for the happy states; slow sway otherwise.
    const bounce = energetic ? Math.abs(Math.sin(t * 4.6)) * 0.09 : 0;
    const wave = energetic ? Math.sin(t * 7) * 0.14 : 0;
    const sway = state === "slump" ? Math.sin(t * 0.9) * 0.02 : Math.sin(t * 0.6) * 0.03;
    const breath = 1 + Math.sin(t * 1.7) * 0.015;

    if (root.current) {
      root.current.position.y = d(
        root.current.position.y,
        pose.rootY + bounce + (energetic ? 0 : Math.sin(t * 1.7) * 0.008),
      );
      root.current.rotation.y = d(root.current.rotation.y, sway);
    }
    if (hips.current) hips.current.rotation.z = d(hips.current.rotation.z, sway * 0.6);
    if (spine.current) {
      spine.current.rotation.x = d(spine.current.rotation.x, pose.spineX);
      spine.current.rotation.z = d(spine.current.rotation.z, -sway * 0.5);
    }
    if (chest.current) chest.current.scale.setScalar(breath);
    if (head.current) {
      const lookAround = state === "idle" ? Math.sin(t * 0.35) * 0.12 : 0;
      head.current.rotation.x = d(head.current.rotation.x, pose.headX);
      head.current.rotation.y = d(head.current.rotation.y, pose.headY + lookAround);
    }
    if (lSh.current && rSh.current) {
      lSh.current.rotation.z = d(lSh.current.rotation.z, pose.shoulderZ + wave);
      rSh.current.rotation.z = d(rSh.current.rotation.z, -(pose.shoulderZ + wave));
      const armSwing = state === "idle" ? Math.sin(t * 0.9) * 0.05 : 0;
      lSh.current.rotation.x = d(lSh.current.rotation.x, pose.shoulderX + armSwing);
      rSh.current.rotation.x = d(rSh.current.rotation.x, pose.shoulderX - armSwing);
    }
    if (lEl.current && rEl.current) {
      lEl.current.rotation.x = d(lEl.current.rotation.x, -pose.elbowX);
      rEl.current.rotation.x = d(rEl.current.rotation.x, -pose.elbowX);
    }

    // Blinking (suppressed mid-celebration squint).
    if (lEye.current && rEye.current) {
      if (t > blink.current.next) {
        blink.current.until = t + 0.11;
        blink.current.next = t + 2.6 + Math.random() * 2.2;
      }
      const blinking = t < blink.current.until;
      const target = blinking ? 0.08 : pose.eyesY;
      const y = d(lEye.current.scale.y, target, 20);
      lEye.current.scale.y = y;
      rEye.current.scale.y = y;
    }
    if (mouth.current) {
      mouth.current.scale.x = d(mouth.current.scale.x, pose.mouthX);
    }
  });

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.85, 0]}>
        {/* legs */}
        {([1, -1] as const).map((side) => (
          <group key={side}>
            <mesh material={joggers} position={[side * 0.11, -0.38, 0]}>
              <capsuleGeometry args={[0.085, 0.5, 6, 16]} />
            </mesh>
            <mesh material={sneaker} position={[side * 0.11, -0.79, 0.05]}>
              <capsuleGeometry args={[0.075, 0.12, 6, 16]} />
            </mesh>
          </group>
        ))}

        {/* spine: torso + arms + head */}
        <group ref={spine}>
          <mesh ref={chest} material={hoodie} position={[0, 0.24, 0]}>
            <capsuleGeometry args={[0.215, 0.35, 8, 24]} />
          </mesh>
          {/* hoodie pocket */}
          <mesh
            material={hoodieDark}
            position={[0, 0.1, 0.205]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <capsuleGeometry args={[0.055, 0.15, 4, 12]} />
          </mesh>
          {/* drawstrings */}
          {([1, -1] as const).map((side) => (
            <mesh
              key={side}
              material={sneaker}
              position={[side * 0.07, 0.42, 0.225]}
              rotation={[0.12, 0, side * -0.08]}
            >
              <capsuleGeometry args={[0.012, 0.1, 4, 8]} />
            </mesh>
          ))}

          <Arm side={1} groupRef={lSh} elbowRef={lEl} hoodie={hoodie} skin={skin} />
          <Arm side={-1} groupRef={rSh} elbowRef={rEl} hoodie={hoodie} skin={skin} />

          {/* head */}
          <group ref={head} position={[0, 0.62, 0]}>
            <mesh material={skin} position={[0, 0.16, 0]}>
              <sphereGeometry args={[0.23, 28, 28]} />
            </mesh>
            {/* hair cap */}
            <mesh material={hair} position={[0, 0.19, -0.02]} rotation={[-0.35, 0, 0]}>
              <sphereGeometry args={[0.235, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            </mesh>
            {/* eyes */}
            <mesh ref={lEye} material={ink} position={[0.085, 0.18, 0.198]}>
              <sphereGeometry args={[0.03, 14, 14]} />
            </mesh>
            <mesh ref={rEye} material={ink} position={[-0.085, 0.18, 0.198]}>
              <sphereGeometry args={[0.03, 14, 14]} />
            </mesh>
            {/* blush */}
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={blush}
                position={[side * 0.145, 0.115, 0.175]}
                scale={[1, 0.7, 0.35]}
              >
                <sphereGeometry args={[0.032, 12, 12]} />
              </mesh>
            ))}
            {/* mouth */}
            <mesh
              ref={mouth}
              material={ink}
              position={[0, 0.085, 0.215]}
              rotation={[0, 0, Math.PI / 2]}
              scale={[1, 1, 0.4]}
            >
              <capsuleGeometry args={[0.012, 0.035, 4, 8]} />
            </mesh>
            {/* headphones — the signature */}
            <mesh material={ink} position={[0, 0.16, 0]}>
              <torusGeometry args={[0.265, 0.032, 12, 36, Math.PI]} />
            </mesh>
            {([1, -1] as const).map((side) => (
              <group key={side} position={[side * 0.25, 0.13, 0]}>
                <mesh material={ink} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.088, 0.088, 0.07, 20]} />
                </mesh>
                <mesh
                  material={accent}
                  rotation={[0, Math.PI / 2, 0]}
                  position={[side * 0.037, 0, 0]}
                >
                  <torusGeometry args={[0.055, 0.014, 8, 24]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
