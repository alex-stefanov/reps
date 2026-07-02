"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The Builder — Reps' character (spec §6.3), at collectible-figure quality:
 * every surface is PBR (MeshPhysicalMaterial) with per-material sheen and
 * clearcoat, silhouettes come from spline-smoothed lathe profiles (no
 * straight cylinder limbs), fabric carries a procedural weave bump, hair is
 * sculpted clumps rather than a helmet, and the whole body casts real soft
 * shadows into the scene.
 *
 * The rig is unchanged: nested groups posed by damped targets per state,
 * ball joints hiding every seam, procedural life on top (breathing, sway,
 * look-around, blinks):
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

/** Procedural fabric weave, used as a bump map on hoodie and joggers. */
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

/** Full PBR material set — skin fakes subsurface warmth via sheen. */
function useMaterials() {
  return useMemo(() => {
    const weave = makeWeaveTexture();
    const fabric = (color: string, sheenColor: string) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.82,
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
      joggers: fabric("#2f3138", "#7a8090"),
      sneaker: new THREE.MeshPhysicalMaterial({
        color: "#f5f5f7",
        roughness: 0.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
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
        roughness: 0.7,
        sheen: 0.8,
        sheenColor: new THREE.Color("#ff8f6b"),
      }),
      hair: new THREE.MeshPhysicalMaterial({
        color: "#3a2d20",
        roughness: 0.42,
        sheen: 1.0,
        sheenColor: new THREE.Color("#8a6a4a"),
        sheenRoughness: 0.35,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
      }),
      plastic: new THREE.MeshPhysicalMaterial({
        color: "#1d1e23",
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.14,
      }),
      accentMetal: new THREE.MeshPhysicalMaterial({
        color: "#30d158",
        roughness: 0.28,
        metalness: 0.55,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      }),
      eye: new THREE.MeshPhysicalMaterial({
        color: "#1d1e23",
        roughness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
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
        [0.168, 0.15],
        [0.178, 0.26],
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
    // Limbs taper along their length — shoulder→wrist, hip→ankle.
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
    const thigh = splineLathe(
      [
        [0.001, 0.05],
        [0.084, 0.02],
        [0.086, -0.08],
        [0.072, -0.2],
        [0.062, -0.3],
        [0.001, -0.33],
      ],
      22,
      28,
    );
    const calf = splineLathe(
      [
        [0.001, 0.03],
        [0.062, 0.0],
        [0.066, -0.07],
        [0.05, -0.18],
        [0.042, -0.26],
        [0.001, -0.28],
      ],
      22,
      28,
    );
    return { torso, upperArm, forearm, thigh, calf };
  }, []);
}

/** Sculpted hair: overlapping clumps along the crown and fringe. */
const HAIR_CLUMPS: {
  pos: [number, number, number];
  scale: [number, number, number];
  rot: [number, number, number];
}[] = [
  { pos: [0, 0.3, -0.02], scale: [1.02, 0.72, 1.0], rot: [-0.2, 0, 0] },
  { pos: [0, 0.2, -0.1], scale: [0.95, 0.85, 0.7], rot: [0.15, 0, 0] },
  { pos: [0.1, 0.31, 0.1], scale: [0.62, 0.34, 0.55], rot: [0.45, 0.3, -0.12] },
  { pos: [-0.07, 0.32, 0.11], scale: [0.55, 0.3, 0.5], rot: [0.5, -0.25, 0.1] },
  { pos: [0.03, 0.34, 0.02], scale: [0.7, 0.4, 0.66], rot: [0.1, 0.15, 0.06] },
  { pos: [0.15, 0.22, 0.02], scale: [0.38, 0.5, 0.52], rot: [0, 0.3, -0.25] },
  { pos: [-0.15, 0.22, 0.01], scale: [0.38, 0.52, 0.5], rot: [0, -0.3, 0.25] },
  { pos: [0.09, 0.28, 0.14], scale: [0.42, 0.24, 0.4], rot: [0.65, 0.2, -0.3] },
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

  // Every mesh in the body casts into the soft shadow pipeline.
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

  const eye = (side: 1 | -1, ref: React.RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[side * 0.072, 0.19, 0.165]}>
      <mesh material={m.eye} scale={[1, 1.4, 0.55]}>
        <sphereGeometry args={[0.026, 20, 20]} />
      </mesh>
      <mesh material={m.white} position={[0.008, 0.012, 0.012]}>
        <sphereGeometry args={[0.007, 10, 10]} />
      </mesh>
    </group>
  );

  const arm = (
    side: 1 | -1,
    groupRef: React.RefObject<THREE.Group | null>,
    elbowRef: React.RefObject<THREE.Group | null>,
  ) => (
    <group ref={groupRef} position={[side * 0.182, 0.44, 0]}>
      <mesh material={m.hoodie}>
        <sphereGeometry args={[0.068, 24, 24]} />
      </mesh>
      <mesh material={m.hoodie} geometry={geo.upperArm} position={[side * 0.012, -0.04, 0]} />
      <group ref={elbowRef} position={[side * 0.016, -0.26, 0]}>
        <mesh material={m.hoodie}>
          <sphereGeometry args={[0.056, 22, 22]} />
        </mesh>
        <mesh material={m.hoodie} geometry={geo.forearm} position={[0, -0.03, 0]} />
        <mesh material={m.skin} position={[0, -0.225, 0.01]} scale={[0.92, 1.15, 0.95]}>
          <sphereGeometry args={[0.058, 24, 24]} />
        </mesh>
      </group>
    </group>
  );

  const leg = (side: 1 | -1) => (
    <group position={[side * 0.096, -0.045, 0]}>
      <mesh material={m.joggers}>
        <sphereGeometry args={[0.085, 22, 22]} />
      </mesh>
      <mesh material={m.joggers} geometry={geo.thigh} position={[0, -0.06, 0]} />
      <mesh material={m.joggers} position={[0, -0.41, 0.005]}>
        <sphereGeometry args={[0.07, 22, 22]} />
      </mesh>
      <mesh material={m.joggers} geometry={geo.calf} position={[0, -0.46, 0]} />
      <mesh material={m.sneaker} position={[0, -0.865, 0.02]} scale={[1, 0.75, 1.45]}>
        <sphereGeometry args={[0.075, 24, 24]} />
      </mesh>
      <mesh material={m.sneaker} position={[0, -0.885, 0.1]} scale={[0.9, 0.55, 1]}>
        <sphereGeometry args={[0.068, 20, 20]} />
      </mesh>
    </group>
  );

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.98, 0]}>
        {leg(1)}
        {leg(-1)}

        <group ref={spine}>
          <group ref={chest}>
            <mesh material={m.hoodie} geometry={geo.torso} />
            {/* hood volume behind the neck */}
            <mesh
              material={m.hoodieDark}
              position={[0, 0.49, -0.13]}
              scale={[1.35, 0.55, 0.75]}
            >
              <sphereGeometry args={[0.105, 24, 24]} />
            </mesh>
            {/* pocket */}
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
                material={m.sneaker}
                position={[side * 0.06, 0.42, 0.185]}
                rotation={[0.14, 0, side * -0.06]}
              >
                <capsuleGeometry args={[0.01, 0.09, 6, 12]} />
              </mesh>
            ))}
          </group>

          {arm(1, lSh, lEl)}
          {arm(-1, rSh, rEl)}

          {/* neck + head */}
          <group ref={head} position={[0, 0.56, 0]}>
            <mesh material={m.skin} position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.058, 0.066, 0.1, 24]} />
            </mesh>
            <mesh material={m.skin} position={[0, 0.19, 0]} scale={[0.94, 1.04, 0.92]}>
              <sphereGeometry args={[0.195, 40, 40]} />
            </mesh>

            {/* sculpted hair clumps */}
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
                position={[side * 0.074, 0.245, 0.163]}
                rotation={[0.1, 0, side * -0.12 + Math.PI / 2]}
              >
                <capsuleGeometry args={[0.009, 0.038, 6, 12]} />
              </mesh>
            ))}
            <mesh material={m.skin} position={[0, 0.155, 0.185]} scale={[0.9, 1.1, 0.8]}>
              <sphereGeometry args={[0.02, 16, 16]} />
            </mesh>
            <mesh
              ref={mouth}
              material={m.eye}
              position={[0, 0.115, 0.168]}
              rotation={[0.25, 0, Math.PI + 0.85]}
              scale={[1, 1, 0.5]}
            >
              <torusGeometry args={[0.042, 0.0085, 10, 26, 1.7]} />
            </mesh>
            {([1, -1] as const).map((side) => (
              <mesh
                key={side}
                material={m.blush}
                position={[side * 0.115, 0.125, 0.145]}
                scale={[1, 0.65, 0.35]}
              >
                <sphereGeometry args={[0.028, 16, 16]} />
              </mesh>
            ))}

            {/* headphones — glossy plastic band, metal accent rings */}
            <mesh material={m.plastic} position={[0, 0.19, 0]}>
              <torusGeometry args={[0.215, 0.02, 12, 40, Math.PI]} />
            </mesh>
            {([1, -1] as const).map((side) => (
              <group key={side} position={[side * 0.192, 0.165, 0]}>
                <mesh material={m.plastic} rotation={[0, 0, Math.PI / 2]}>
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
          </group>
        </group>
      </group>
    </group>
  );
}
