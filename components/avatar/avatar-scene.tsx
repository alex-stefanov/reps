"use client";

import { Suspense, useMemo, useState } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  N8AO,
} from "@react-three/postprocessing";
import * as THREE from "three";
import type { SceneDay } from "@/lib/server/home-view";
import { BlobShadow } from "./blob-shadow";
import { Builder, type AvatarState } from "./builder";
import { WeekPath } from "./week-path";

/**
 * Rendering pipeline for the hero scene, tuned for "digital collectible"
 * quality on integrated GPUs:
 *  - image-based lighting from a procedural Lightformer studio (PMREM under
 *    the hood via drei's Environment — no runtime HDRI download to fail)
 *  - three-point light rig; only the key casts, PCFSoft, 1024 map
 *  - ACES filmic tone mapping (R3F default) + post: N8AO ambient occlusion,
 *    subtle bloom on emissive highlights, gentle depth of field that keeps
 *    the character crisp and softens the island edges
 *  - soft radial-gradient backdrop instead of a flat pastel fill
 */

function Backdrop() {
  const texture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2,
      size * 0.38,
      size * 0.08,
      size / 2,
      size * 0.5,
      size * 0.75,
    );
    grad.addColorStop(0, "#f4f9ff");
    grad.addColorStop(0.55, "#ecf4ef");
    grad.addColorStop(1, "#dfece2");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // Declarative scene.background — R3F detaches it on unmount.
  return <primitive object={texture} attach="background" />;
}

/**
 * Quality gate: the full pipeline (AO, bloom, DoF, soft shadows) assumes a
 * real GPU. Software renderers (SwiftShader/llvmpipe — headless browsers,
 * VMs, GPU-blocklisted machines) get the plain forward path instead of a
 * slideshow.
 */
function useHasRealGpu(): boolean {
  // Lazy one-shot detection: this component is client-only (ssr:false).
  const [hasGpu] = useState(() => {
    if (typeof document === "undefined") return true;
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) return false;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = String(
        gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
      );
      return !/swiftshader|llvmpipe|software/i.test(renderer);
    } catch {
      return false;
    }
  });
  return hasGpu;
}

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
      1.3 + pointer.y * 0.22,
      3,
      delta,
    );
    camera.lookAt(0, 0.8, 0);
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
  const fullQuality = useHasRealGpu();

  return (
    <Canvas
      shadows={fullQuality ? "soft" : false}
      dpr={fullQuality ? [1, 1.75] : 1}
      gl={{ antialias: true }}
      camera={{ position: [0, 1.3, 4.7], fov: 36 }}
      style={{ touchAction: "pan-y" }}
      aria-label="Your builder standing on this week's path"
    >
      <Backdrop />

      {/* Image-based lighting: a procedural studio, PMREM'd by drei. */}
      <Environment resolution={128} frames={1}>
        <Lightformer
          intensity={1.6}
          position={[0, 5, 3]}
          scale={[7, 3, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={0.9}
          position={[-5, 2, 2]}
          scale={[3, 3, 1]}
          color="#eaf2ff"
        />
        <Lightformer
          intensity={1.1}
          position={[5, 3, -2]}
          scale={[3, 4, 1]}
          color="#e2ffe9"
        />
        <Lightformer
          intensity={0.7}
          position={[0, 2, -6]}
          scale={[10, 2, 1]}
          color="#d6e9ff"
        />
      </Environment>

      {/* Three-point rig; the key casts soft shadows. */}
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-far={14}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
      />
      <directionalLight position={[-4, 2.5, 3]} intensity={0.5} color="#dfe8ff" />
      <directionalLight position={[0, 2.5, -5]} intensity={0.9} color="#d6ffe4" />

      <Suspense fallback={null}>
        <Builder state={state} />
        <WeekPath week={week} todayIndex={todayIndex} />
        {/* faint contact blob under the feet, on top of real shadows */}
        <BlobShadow position={[0, 0.012, 0]} scale={0.6} opacity={0.14} />
      </Suspense>

      {fullQuality && (
        <EffectComposer multisampling={4}>
          <N8AO halfRes aoRadius={0.45} intensity={2.2} distanceFalloff={0.6} />
          <Bloom mipmapBlur luminanceThreshold={1.0} intensity={0.45} />
          <DepthOfField
            target={[0, 1.1, 0]}
            focalLength={0.01}
            bokehScale={1.8}
            height={480}
          />
        </EffectComposer>
      )}

      <Rig />
    </Canvas>
  );
}
