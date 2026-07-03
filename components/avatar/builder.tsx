"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The Builder — Reps' character, matched to the reference concept: a young
 * dev with a swept-up quiff, thick rectangular glasses, a green gaming
 * headset with a mic boom, the brand hoodie with a chest chevron and ribbed
 * cuffs, slim dark denim with rolled cuffs, and green sneakers. Athletic
 * stylized proportions (~5.5 heads), one continuous body — no assembled
 * blocks, no downloaded model.
 *
 * Rig: nested groups posed by damped targets per state, ball joints hiding
 * seams, procedural life on top (breathing, sway, look-around, blinks):
 *   idle / flourish (task checked) / celebrate (day done) / slump (streak lost)
 */

export type AvatarState = "idle" | "flourish" | "celebrate" | "slump";

interface PoseTargets {
  spineX: number;
  headX: number;
  headY: number;
  shoulderZ: number;
  shoulderX: number;
  elbowX: number;
  rootY: number;
  eyesY: number;
  mouthX: number;
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

/** Procedural fabric weave, used as a bump map on hoodie and denim. */
function makeWeaveTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const shade = 118 + ((x + y) % 4 === 0 ? 24 : 0) + Math.random() * 14;
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function useMaterials() {
  return useMemo(() => {
    const weave = makeWeaveTexture();
    const fabric = (color: string, sheenColor: string, roughness = 0.82) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        metalness: 0,
        sheen: 0.65,
        sheenColor: new THREE.Color(sheenColor),
        sheenRoughness: 0.6,
        bumpMap: weave,
        bumpScale: 0.35,
      });
    return {
      hoodie: fabric("#2fbf63", "#8affb0"),
      hoodieDark: fabric("#249c50", "#6ee89a"),
      denim: fabric("#3a3f4a", "#7a8090", 0.78),
      denimCuff: fabric("#575d69", "#9aa1ae", 0.72),
      logo: new THREE.MeshPhysicalMaterial({
        color: "#e4fbee",
        roughness: 0.5,
        sheen: 0.5,
        sheenColor: new THREE.Color("#ffffff"),
      }),
      sneakerWhite: new THREE.MeshPhysicalMaterial({
        color: "#f7f7f9",
        roughness: 0.32,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
      }),
      sneakerGreen: new THREE.MeshPhysicalMaterial({
        color: "#2fae57",
        roughness: 0.4,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
      }),
      skin: new THREE.MeshPhysicalMaterial({
        color: "#f3c6a5",
        roughness: 0.48,
        sheen: 1.0,
        sheenColor: new THREE.Color("#ff9d78"),
        sheenRoughness: 0.72,
        clearcoat: 0.06,
        clearcoatRoughness: 0.6,
      }),
      blush: new THREE.MeshPhysicalMaterial({
        color: "#eba98a",
        roughness: 0.75,
        sheen: 0.6,
        sheenColor: new THREE.Color("#ff8f6b"),
      }),
      hair: new THREE.MeshPhysicalMaterial({
        color: "#4a3826",
        roughness: 0.4,
        sheen: 1.0,
        sheenColor: new THREE.Color("#a07c50"),
        sheenRoughness: 0.32,
        clearcoat: 0.3,
        clearcoatRoughness: 0.35,
      }),
      plastic: new THREE.MeshPhysicalMaterial({
        color: "#23242a",
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.14,
      }),
      cupGreen: new THREE.MeshPhysicalMaterial({
        color: "#2fae57",
        roughness: 0.24,
        clearcoat: 1.0,
        clearcoatRoughness: 0.15,
      }),
      accentMetal: new THREE.MeshPhysicalMaterial({
        color: "#bfe9cd",
        roughness: 0.25,
        metalness: 0.6,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      }),
      sclera: new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        roughness: 0.22,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
      }),
      iris: new THREE.MeshPhysicalMaterial({
        color: "#3f9b57",
        roughness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      }),
      ink: new THREE.MeshPhysicalMaterial({
        color: "#1d1e23",
        roughness: 0.15,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
      }),
      lens: new THREE.MeshPhysicalMaterial({
        color: "#dcecff",
        roughness: 0.05,
        transparent: true,
        opacity: 0.16,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
      }),
      white: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.2 }),
    };
  }, []);
}

/** Spline-smoothed lathe: organic silhouettes instead of faceted primitives. */
function splineLathe(
  controls: [number, number][],
  samples = 28,
  segments = 40,
): THREE.LatheGeometry {
  const curve = new THREE.SplineCurve(
    controls.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  const geo = new THREE.LatheGeometry(curve.getPoints(samples), segments);
  geo.computeVertexNormals();
  return geo;
}

function useBodyGeometry() {
  return useMemo(() => {
    const torso = splineLathe(
      [
        [0.001, -0.08],
        [0.11, -0.075],
        [0.165, -0.03],
        [0.185, 0.03],
        [0.166, 0.15],
        [0.176, 0.26],
        [0.198, 0.37],
        [0.2, 0.43],
        [0.17, 0.49],
        [0.105, 0.54],
        [0.062, 0.565],
        [0.001, 0.57],
      ],
      36,
      48,
    );
    const upperArm = splineLathe(
      [
        [0.001, 0.04],
        [0.06, 0.02],
        [0.064, -0.05],
        [0.054, -0.13],
        [0.048, -0.18],
        [0.001, -0.2],
      ],
      20,
      28,
    );
    const forearm = splineLathe(
      [
        [0.001, 0.03],
        [0.052, 0.01],
        [0.05, -0.06],
        [0.04, -0.12],
        [0.034, -0.16],
        [0.001, -0.18],
      ],
      20,
      28,
    );
    // Slim denim: long thigh and calf for ~5.5-head proportions.
    const thigh = splineLathe(
      [
        [0.001, 0.05],
        [0.086, 0.02],
        [0.088, -0.1],
        [0.07, -0.27],
        [0.06, -0.4],
        [0.001, -0.43],
      ],
      24,
      28,
    );
    const calf = splineLathe(
      [
        [0.001, 0.03],
        [0.062, 0.0],
        [0.066, -0.1],
        [0.05, -0.25],
        [0.042, -0.34],
        [0.001, -0.37],
      ],
      24,
      28,
    );
    // Mic boom: a smooth tube from the right cup toward the mouth.
    const micCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.185, 0.12, 0.04),
      new THREE.Vector3(0.165, 0.06, 0.13),
      new THREE.Vector3(0.105, 0.05, 0.185),
    ]);
    const micBoom = new THREE.TubeGeometry(micCurve, 16, 0.009, 8);
    return { torso, upperArm, forearm, thigh, calf, micBoom };
  }, []);
}

/** Swept-up quiff: clumps rising at the front, short sides, full crown. */
const HAIR_CLUMPS: {
  pos: [number, number, number];
  scale: [number, number, number];
  rot: [number, number, number];
}[] = [
  { pos: [0, 0.185, -0.085], scale: [0.92, 0.8, 0.72], rot: [0.15, 0, 0] },
  { pos: [0, 0.3, -0.04], scale: [0.95, 0.62, 0.88], rot: [-0.12, 0, 0] },
  { pos: [0.15, 0.21, 0], scale: [0.34, 0.5, 0.48], rot: [0, 0.25, -0.15] },
  { pos: [-0.15, 0.21, 0], scale: [0.34, 0.5, 0.48], rot: [0, -0.25, 0.15] },
  { pos: [0.01, 0.35, 0.09], scale: [0.8, 0.5, 0.62], rot: [-0.35, 0, 0.05] },
  { pos: [0.03, 0.4, 0.12], scale: [0.6, 0.46, 0.45], rot: [-0.55, 0.1, -0.08] },
  { pos: [0.06, 0.42, 0.15], scale: [0.4, 0.34, 0.32], rot: [-0.75, 0.15, -0.15] },
  { pos: [-0.06, 0.365, 0.13], scale: [0.5, 0.34, 0.4], rot: [-0.6, -0.15, 0.12] },
  // low fringe along the hairline so the forehead isn't a dome
  { pos: [0, 0.315, 0.125], scale: [0.78, 0.3, 0.42], rot: [-0.3, 0, 0] },
  { pos: [0.11, 0.3, 0.1], scale: [0.4, 0.3, 0.38], rot: [-0.25, 0.25, -0.2] },
  { pos: [-0.11, 0.3, 0.1], scale: [0.4, 0.3, 0.38], rot: [-0.25, -0.25, 0.2] },
];

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
  const m = useMaterials();
  const geo = useBodyGeometry();

  useEffect(() => {
    root.current?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.castShadow = true;
    });
  }, []);

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

  /** Full eye: sclera, green iris, pupil, catchlight — blinks as a group. */
  const eye = (side: 1 | -1, ref: React.RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[side * 0.072, 0.19, 0.162]}>
      <mesh material={m.sclera} scale={[1, 1.3, 0.5]}>
        <sphereGeometry args={[0.034, 22, 22]} />
      </mesh>
      <mesh material={m.iris} position={[0, 0, 0.013]} scale={[1, 1, 0.5]}>
        <sphereGeometry args={[0.0175, 18, 18]} />
      </mesh>
      <mesh material={m.ink} position={[0, 0, 0.021]} scale={[1, 1, 0.5]}>
        <sphereGeometry args={[0.0085, 12, 12]} />
      </mesh>
      <mesh material={m.white} position={[0.007, 0.007, 0.026]}>
        <sphereGeometry args={[0.0045, 8, 8]} />
      </mesh>
    </group>
  );

  /** Thick rectangular frame: four bars + glass lens per eye. */
  const spectacle = (side: 1 | -1) => (
    <group key={side} position={[side * 0.074, 0.192, 0.188]}>
      <mesh material={m.plastic} position={[0, 0.034, 0]}>
        <boxGeometry args={[0.098, 0.013, 0.015]} />
      </mesh>
      <mesh material={m.plastic} position={[0, -0.034, 0]}>
        <boxGeometry args={[0.098, 0.013, 0.015]} />
      </mesh>
      <mesh material={m.plastic} position={[side * 0.046, 0, 0]}>
        <boxGeometry args={[0.013, 0.078, 0.015]} />
      </mesh>
      <mesh material={m.plastic} position={[side * -0.046, 0, 0]}>
        <boxGeometry args={[0.013, 0.078, 0.015]} />
      </mesh>
      <mesh material={m.lens}>
        <boxGeometry args={[0.082, 0.056, 0.004]} />
      </mesh>
    </group>
  );

  const arm = (
    side: 1 | -1,
    groupRef: React.RefObject<THREE.Group | null>,
    elbowRef: React.RefObject<THREE.Group | null>,
  ) => (
    <group ref={groupRef} position={[side * 0.19, 0.44, 0]}>
      <mesh material={m.hoodie}>
        <sphereGeometry args={[0.068, 24, 24]} />
      </mesh>
      <mesh material={m.hoodie} geometry={geo.upperArm} position={[side * 0.012, -0.04, 0]} />
      <group ref={elbowRef} position={[side * 0.016, -0.26, 0]}>
        <mesh material={m.hoodie}>
          <sphereGeometry args={[0.056, 22, 22]} />
        </mesh>
        <mesh material={m.hoodie} geometry={geo.forearm} position={[0, -0.03, 0]} />
        {/* ribbed cuff */}
        <mesh material={m.hoodieDark} position={[0, -0.175, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.041, 0.012, 8, 24]} />
        </mesh>
        {/* fist */}
        <mesh material={m.skin} position={[0, -0.23, 0.01]} scale={[0.95, 1.05, 0.9]}>
          <sphereGeometry args={[0.058, 24, 24]} />
        </mesh>
      </group>
    </group>
  );

  const leg = (side: 1 | -1) => (
    <group position={[side * 0.098, -0.045, 0]}>
      <mesh material={m.denim}>
        <sphereGeometry args={[0.088, 22, 22]} />
      </mesh>
      <mesh material={m.denim} geometry={geo.thigh} position={[0, -0.05, 0]} />
      <mesh material={m.denim} position={[0, -0.51, 0.005]}>
        <sphereGeometry args={[0.068, 22, 22]} />
      </mesh>
      <mesh material={m.denim} geometry={geo.calf} position={[0, -0.56, 0]} />
      {/* rolled cuff */}
      <mesh material={m.denimCuff} position={[0, -0.925, 0]}>
        <cylinderGeometry args={[0.055, 0.058, 0.055, 20]} />
      </mesh>
      {/* green sneaker: white sole, green upper, white toe */}
      <group position={[0, -1.0, 0]}>
        <mesh
          material={m.sneakerWhite}
          position={[0, -0.03, 0.03]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1, 1.25, 0.55]}
        >
          <capsuleGeometry args={[0.058, 0.1, 8, 18]} />
        </mesh>
        <mesh material={m.sneakerGreen} position={[0, 0.01, 0.03]} scale={[0.95, 0.75, 1.4]}>
          <sphereGeometry args={[0.062, 22, 22]} />
        </mesh>
        <mesh material={m.sneakerWhite} position={[0, -0.01, 0.135]} scale={[0.75, 0.55, 0.8]}>
          <sphereGeometry args={[0.048, 18, 18]} />
        </mesh>
        {/* lace hint */}
        <mesh material={m.white} position={[0, 0.045, 0.075]} rotation={[0.5, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.006, 0.05, 4, 8]} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 1.08, 0]}>
        {leg(1)}
        {leg(-1)}

        <group ref={spine}>
          <group ref={chest}>
            <mesh material={m.hoodie} geometry={geo.torso} />
            {/* ribbed hem */}
            <mesh material={m.hoodieDark} position={[0, -0.062, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.155, 0.02, 8, 36]} />
            </mesh>
            {/* hood volume behind the neck */}
            <mesh
              material={m.hoodieDark}
              position={[0, 0.49, -0.13]}
              scale={[1.35, 0.55, 0.75]}
            >
              <sphereGeometry args={[0.105, 24, 24]} />
            </mesh>
            {/* kangaroo pocket */}
            <mesh
              material={m.hoodieDark}
              position={[0, 0.06, 0.168]}
              rotation={[0.14, 0, Math.PI / 2]}
            >
              <capsuleGeometry args={[0.05, 0.13, 8, 18]} />
            </mesh>
            {/* drawstrings */}
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={m.white}
                position={[side * 0.06, 0.42, 0.185]}
                rotation={[0.14, 0, side * -0.06]}
              >
                <capsuleGeometry args={[0.01, 0.09, 6, 12]} />
              </mesh>
            ))}
            {/* chest chevron logo */}
            <group position={[0.085, 0.315, 0.178]} rotation={[0.12, 0.1, 0]}>
              <mesh material={m.logo} position={[0, 0.013, 0]} rotation={[0, 0, 0.75]}>
                <capsuleGeometry args={[0.0075, 0.036, 4, 10]} />
              </mesh>
              <mesh material={m.logo} position={[0, -0.013, 0]} rotation={[0, 0, -0.75]}>
                <capsuleGeometry args={[0.0075, 0.036, 4, 10]} />
              </mesh>
            </group>
          </group>

          {arm(1, lSh, lEl)}
          {arm(-1, rSh, rEl)}

          {/* neck + head (scaled for taller proportions) */}
          <group ref={head} position={[0, 0.575, 0]} scale={0.9}>
            <mesh material={m.skin} position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.058, 0.066, 0.1, 24]} />
            </mesh>
            <mesh material={m.skin} position={[0, 0.19, 0]} scale={[0.94, 1.04, 0.92]}>
              <sphereGeometry args={[0.195, 40, 40]} />
            </mesh>

            {/* quiff */}
            {HAIR_CLUMPS.map((clump, i) => (
              <mesh
                key={i}
                material={m.hair}
                position={clump.pos}
                rotation={clump.rot}
                scale={clump.scale}
              >
                <sphereGeometry args={[0.19, 20, 20]} />
              </mesh>
            ))}

            {/* face */}
            {eye(1, lEye)}
            {eye(-1, rEye)}
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={m.hair}
                position={[side * 0.074, 0.252, 0.163]}
                rotation={[0.1, 0, side * -0.05 + Math.PI / 2]}
              >
                <capsuleGeometry args={[0.0105, 0.042, 6, 12]} />
              </mesh>
            ))}
            <mesh material={m.skin} position={[0, 0.15, 0.185]} scale={[0.9, 1.1, 0.8]}>
              <sphereGeometry args={[0.02, 16, 16]} />
            </mesh>
            <mesh
              ref={mouth}
              material={m.ink}
              position={[0, 0.105, 0.172]}
              rotation={[0.25, 0, Math.PI + 0.85]}
              scale={[1, 1, 0.5]}
            >
              <torusGeometry args={[0.038, 0.008, 10, 26, 1.6]} />
            </mesh>
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={m.blush}
                position={[side * 0.112, 0.115, 0.148]}
                scale={[0.8, 0.5, 0.3]}
              >
                <sphereGeometry args={[0.026, 16, 16]} />
              </mesh>
            ))}

            {/* glasses */}
            {spectacle(1)}
            {spectacle(-1)}
            <mesh material={m.plastic} position={[0, 0.198, 0.192]}>
              <boxGeometry args={[0.028, 0.012, 0.013]} />
            </mesh>
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={m.plastic}
                position={[side * 0.148, 0.192, 0.095]}
                rotation={[0, side * -1.1, 0]}
              >
                <boxGeometry args={[0.012, 0.011, 0.2]} />
              </mesh>
            ))}

            {/* headset: dark band, green cups, metal rings, mic boom */}
            <mesh material={m.plastic} position={[0, 0.19, 0]}>
              <torusGeometry args={[0.215, 0.02, 12, 40, Math.PI]} />
            </mesh>
            {([1, -1] as const).map((side) => (
              <group key={side} position={[side * 0.192, 0.165, 0]}>
                <mesh material={m.cupGreen} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.068, 0.068, 0.055, 28]} />
                </mesh>
                <mesh
                  material={m.accentMetal}
                  rotation={[0, Math.PI / 2, 0]}
                  position={[side * 0.029, 0, 0]}
                >
                  <torusGeometry args={[0.047, 0.011, 10, 30]} />
                </mesh>
              </group>
            ))}
            <mesh material={m.plastic} geometry={geo.micBoom} />
            <mesh material={m.cupGreen} position={[0.105, 0.05, 0.185]}>
              <sphereGeometry args={[0.016, 14, 14]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
