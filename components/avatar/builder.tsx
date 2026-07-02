"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The Builder — Reps' character (spec §6.3), somewhere between a Sim and a
 * Meta avatar: cartoonish, but one continuous person rather than assembled
 * blocks. The torso is a single lathe-profile mesh (hips → waist → chest →
 * shoulders → neck) and every joint pivots inside a ball that hides the
 * seam, so poses read as a body bending, not parts detaching.
 *
 * Pose states are real skeletal targets, damped per frame, with procedural
 * life on top (breathing, weight shift, look-around, blinks):
 *   idle / flourish (task checked) / celebrate (day done) / slump (streak lost)
 */

export type AvatarState = "idle" | "flourish" | "celebrate" | "slump";

const CLAY = {
  hoodie: "#2fbf63",
  hoodieDark: "#249c50",
  joggers: "#2f3138",
  sneaker: "#f5f5f7",
  skin: "#f3c6a5",
  blush: "#eba98a",
  hair: "#3a2d20",
  ink: "#1d1e23",
  accent: "#30d158",
};

interface PoseTargets {
  spineX: number;
  headX: number;
  headY: number;
  shoulderZ: number; // symmetric raise: 0 = hanging, ~2.6 = overhead
  shoulderX: number; // forward droop
  elbowX: number;
  rootY: number;
  eyesY: number; // eye scale Y (happy squint < 1)
  mouthX: number; // smile scale X (> 1 = wider grin)
}

const POSES: Record<AvatarState, PoseTargets> = {
  idle: {
    spineX: 0.02,
    headX: 0,
    headY: 0,
    shoulderZ: 0.14,
    shoulderX: 0.05,
    elbowX: 0.18,
    rootY: 0,
    eyesY: 1,
    mouthX: 1,
  },
  flourish: {
    spineX: -0.1,
    headX: -0.18,
    headY: 0,
    shoulderZ: 2.7,
    shoulderX: 0,
    elbowX: 0.25,
    rootY: 0,
    eyesY: 0.45,
    mouthX: 1.6,
  },
  celebrate: {
    spineX: -0.08,
    headX: -0.14,
    headY: 0,
    shoulderZ: 2.55,
    shoulderX: 0,
    elbowX: 0.3,
    rootY: 0,
    eyesY: 0.45,
    mouthX: 1.5,
  },
  slump: {
    spineX: 0.38,
    headX: 0.5,
    headY: 0.12,
    shoulderZ: 0.05,
    shoulderX: 0.32,
    elbowX: 0.06,
    rootY: -0.06,
    eyesY: 0.75,
    mouthX: 0.5,
  },
};

function useClay(color: string, roughness = 0.55) {
  return useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 }),
    [color, roughness],
  );
}

/** One smooth torso: hips → waist → chest → shoulders → neck base. */
function useTorsoGeometry() {
  return useMemo(() => {
    const profile: [number, number][] = [
      [0.0, -0.08],
      [0.11, -0.075],
      [0.165, -0.03],
      [0.185, 0.03],
      [0.168, 0.15],
      [0.178, 0.26],
      [0.198, 0.37],
      [0.2, 0.43],
      [0.17, 0.49],
      [0.105, 0.54],
      [0.062, 0.565],
      [0.0, 0.57],
    ];
    const geo = new THREE.LatheGeometry(
      profile.map(([x, y]) => new THREE.Vector2(x, y)),
      28,
    );
    geo.computeVertexNormals();
    return geo;
  }, []);
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
    // Pivot sits inside the shoulder ball so raising the arm never opens a seam.
    <group ref={groupRef} position={[side * 0.182, 0.44, 0]}>
      <mesh material={hoodie}>
        <sphereGeometry args={[0.068, 18, 18]} />
      </mesh>
      <mesh material={hoodie} position={[side * 0.012, -0.13, 0]}>
        <capsuleGeometry args={[0.056, 0.16, 6, 14]} />
      </mesh>
      <group ref={elbowRef} position={[side * 0.016, -0.26, 0]}>
        <mesh material={hoodie}>
          <sphereGeometry args={[0.056, 16, 16]} />
        </mesh>
        <mesh material={hoodie} position={[0, -0.1, 0]}>
          <capsuleGeometry args={[0.05, 0.13, 6, 14]} />
        </mesh>
        {/* hand */}
        <mesh material={skin} position={[0, -0.225, 0.01]} scale={[0.92, 1.15, 0.95]}>
          <sphereGeometry args={[0.058, 18, 18]} />
        </mesh>
      </group>
    </group>
  );
}

function Leg({
  side,
  joggers,
  sneaker,
}: {
  side: 1 | -1;
  joggers: THREE.Material;
  sneaker: THREE.Material;
}) {
  return (
    <group position={[side * 0.096, -0.045, 0]}>
      {/* hip ball */}
      <mesh material={joggers}>
        <sphereGeometry args={[0.085, 16, 16]} />
      </mesh>
      {/* thigh */}
      <mesh material={joggers} position={[0, -0.19, 0]}>
        <capsuleGeometry args={[0.082, 0.2, 6, 14]} />
      </mesh>
      {/* knee */}
      <mesh material={joggers} position={[0, -0.41, 0.005]}>
        <sphereGeometry args={[0.07, 16, 16]} />
      </mesh>
      {/* calf */}
      <mesh material={joggers} position={[0, -0.6, 0]}>
        <capsuleGeometry args={[0.066, 0.2, 6, 14]} />
      </mesh>
      {/* sneaker: heel + toe, chunky */}
      <mesh material={sneaker} position={[0, -0.865, 0.02]} scale={[1, 0.75, 1.45]}>
        <sphereGeometry args={[0.075, 18, 18]} />
      </mesh>
      <mesh material={sneaker} position={[0, -0.885, 0.1]} scale={[0.9, 0.55, 1]}>
        <sphereGeometry args={[0.068, 16, 16]} />
      </mesh>
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
  const chest = useRef<THREE.Group>(null);
  const lEye = useRef<THREE.Group>(null);
  const rEye = useRef<THREE.Group>(null);
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
  const white = useClay("#ffffff", 0.3);
  const torsoGeo = useTorsoGeometry();

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const pose = POSES[state];
    const d = (cur: number, target: number, lambda = 7) =>
      THREE.MathUtils.damp(cur, target, lambda, delta);

    const energetic = state === "celebrate" || state === "flourish";
    const bounce = energetic ? Math.abs(Math.sin(t * 4.6)) * 0.1 : 0;
    const wave = energetic ? Math.sin(t * 7) * 0.14 : 0;
    const sway =
      state === "slump" ? Math.sin(t * 0.9) * 0.02 : Math.sin(t * 0.6) * 0.03;
    const breath = 1 + Math.sin(t * 1.7) * 0.012;

    if (root.current) {
      root.current.position.y = d(
        root.current.position.y,
        pose.rootY + bounce + (energetic ? 0 : Math.sin(t * 1.7) * 0.007),
      );
      root.current.rotation.y = d(root.current.rotation.y, sway);
    }
    if (hips.current)
      hips.current.rotation.z = d(hips.current.rotation.z, sway * 0.5);
    if (spine.current) {
      spine.current.rotation.x = d(spine.current.rotation.x, pose.spineX);
      spine.current.rotation.z = d(spine.current.rotation.z, -sway * 0.5);
    }
    if (chest.current) chest.current.scale.setScalar(breath);
    if (head.current) {
      const lookAround = state === "idle" ? Math.sin(t * 0.35) * 0.12 : 0;
      head.current.rotation.x = d(head.current.rotation.x, pose.headX);
      head.current.rotation.y = d(
        head.current.rotation.y,
        pose.headY + lookAround,
      );
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

  const eye = (side: 1 | -1, ref: React.RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[side * 0.072, 0.19, 0.165]}>
      <mesh material={ink} scale={[1, 1.4, 0.55]}>
        <sphereGeometry args={[0.026, 14, 14]} />
      </mesh>
      {/* catchlight — the Pixar dot that makes eyes read alive */}
      <mesh material={white} position={[0.008, 0.012, 0.012]}>
        <sphereGeometry args={[0.007, 8, 8]} />
      </mesh>
    </group>
  );

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.98, 0]}>
        <Leg side={1} joggers={joggers} sneaker={sneaker} />
        <Leg side={-1} joggers={joggers} sneaker={sneaker} />

        {/* spine: one continuous torso + arms + head */}
        <group ref={spine}>
          <group ref={chest}>
            <mesh material={hoodie} geometry={torsoGeo} />
            {/* hood volume behind the neck */}
            <mesh
              material={hoodieDark}
              position={[0, 0.49, -0.13]}
              scale={[1.35, 0.55, 0.75]}
            >
              <sphereGeometry args={[0.105, 18, 18]} />
            </mesh>
            {/* pocket */}
            <mesh
              material={hoodieDark}
              position={[0, 0.06, 0.168]}
              rotation={[0.14, 0, Math.PI / 2]}
            >
              <capsuleGeometry args={[0.05, 0.13, 4, 12]} />
            </mesh>
            {/* drawstrings */}
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={sneaker}
                position={[side * 0.06, 0.42, 0.185]}
                rotation={[0.14, 0, side * -0.06]}
              >
                <capsuleGeometry args={[0.01, 0.09, 4, 8]} />
              </mesh>
            ))}
          </group>

          <Arm side={1} groupRef={lSh} elbowRef={lEl} hoodie={hoodie} skin={skin} />
          <Arm side={-1} groupRef={rSh} elbowRef={rEl} hoodie={hoodie} skin={skin} />

          {/* neck + head */}
          <group ref={head} position={[0, 0.56, 0]}>
            <mesh material={skin} position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.058, 0.066, 0.1, 16]} />
            </mesh>
            <mesh material={skin} position={[0, 0.19, 0]} scale={[0.94, 1.04, 0.92]}>
              <sphereGeometry args={[0.195, 28, 28]} />
            </mesh>
            {/* hair: cap + back volume + fringe swoop */}
            <mesh
              material={hair}
              position={[0, 0.215, -0.015]}
              rotation={[-0.28, 0, 0]}
              scale={[0.98, 1, 0.98]}
            >
              <sphereGeometry args={[0.2, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            </mesh>
            <mesh material={hair} position={[0, 0.17, -0.06]} scale={[0.95, 0.9, 0.8]}>
              <sphereGeometry args={[0.195, 22, 22]} />
            </mesh>
            <mesh
              material={hair}
              position={[0.045, 0.3, 0.13]}
              rotation={[0.5, 0.2, 0.15]}
              scale={[1.6, 0.5, 0.9]}
            >
              <sphereGeometry args={[0.055, 14, 14]} />
            </mesh>

            {/* face */}
            {eye(1, lEye)}
            {eye(-1, rEye)}
            {/* brows */}
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={hair}
                position={[side * 0.074, 0.245, 0.163]}
                rotation={[0.1, 0, side * -0.12 + Math.PI / 2]}
              >
                <capsuleGeometry args={[0.009, 0.038, 4, 8]} />
              </mesh>
            ))}
            {/* nose */}
            <mesh material={skin} position={[0, 0.155, 0.185]} scale={[0.9, 1.1, 0.8]}>
              <sphereGeometry args={[0.02, 12, 12]} />
            </mesh>
            {/* smile — a torus arc, widened by the pose */}
            <mesh
              ref={mouth}
              material={ink}
              position={[0, 0.115, 0.168]}
              rotation={[0.25, 0, Math.PI + 0.85]}
              scale={[1, 1, 0.5]}
            >
              <torusGeometry args={[0.042, 0.0085, 8, 20, 1.7]} />
            </mesh>
            {/* blush */}
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={blush}
                position={[side * 0.115, 0.125, 0.145]}
                scale={[1, 0.65, 0.35]}
              >
                <sphereGeometry args={[0.028, 12, 12]} />
              </mesh>
            ))}

            {/* headphones — the signature, hugging the head */}
            <mesh material={ink} position={[0, 0.19, 0]}>
              <torusGeometry args={[0.215, 0.02, 10, 32, Math.PI]} />
            </mesh>
            {([1, -1] as const).map((side) => (
              <group key={side} position={[side * 0.192, 0.165, 0]}>
                <mesh material={ink} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.068, 0.068, 0.055, 20]} />
                </mesh>
                <mesh
                  material={accent}
                  rotation={[0, Math.PI / 2, 0]}
                  position={[side * 0.029, 0, 0]}
                >
                  <torusGeometry args={[0.047, 0.011, 8, 24]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
