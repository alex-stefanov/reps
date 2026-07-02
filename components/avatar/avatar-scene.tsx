"use client";

import { Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneDay } from "@/lib/server/home-view";
import { BlobShadow } from "./blob-shadow";
import { Builder, type AvatarState } from "./builder";
import { WeekPath } from "./week-path";

/** Soft pointer parallax — the scene leans with the cursor, iOS-style. */
function Rig() {
  useFrame(({ camera, pointer }, delta) => {
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      pointer.x * 0.45,
      3,
      delta,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      1.35 + pointer.y * 0.22,
      3,
      delta,
    );
    camera.lookAt(0, 0.95, 0);
  });
  return null;
}

export default function AvatarScene({
  state,
  week,
  todayIndex,
}: {
  state: AvatarState;
  week: SceneDay[];
  todayIndex: number;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 1.35, 4.4], fov: 33 }}
      style={{ touchAction: "pan-y" }}
      aria-label="Your builder standing on this week's path"
    >
      {/* Lighting-only depth: no shadow maps anywhere — the blob shadow
          grounds the character and keeps weak GPUs at full frame rate. */}
      <ambientLight intensity={0.95} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} />
      <directionalLight position={[-4, 3, -2]} intensity={0.45} color="#dfe8ff" />
      <directionalLight position={[0, 2, -5]} intensity={0.6} color="#d6ffe4" />

      <Suspense fallback={null}>
        <Builder state={state} />
        <WeekPath week={week} todayIndex={todayIndex} />
        <BlobShadow position={[0, 0.012, 0]} scale={0.72} />
      </Suspense>
      <Rig />
    </Canvas>
  );
}
