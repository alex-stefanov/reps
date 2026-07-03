"use client";

import { Suspense, useMemo, useState } from "react";
import {
  Environment,
  Lightformer,
  PresentationControls,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneDay } from "@/lib/server/home-view";
import { BlobShadow } from "./blob-shadow";
import { Builder, type AvatarState } from "./builder";
import { Podium } from "./podium";

/**
 * The hero scene: a fully 3D character stand you can grab and turn.
 * Drag rotates the whole diorama (spring-loaded, snaps back upright);
 * rendering stays crisp and fast — PBR materials, image-based lighting
 * from a procedural PMREM studio, PCFSoft shadows, ACES tone mapping,
 * and deliberately NO post-processing blur passes.
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

  return <primitive object={texture} attach="background" />;
}

/** Software renderers get the plain forward path instead of a slideshow. */
function useHasRealGpu(): boolean {
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

export default function AvatarScene({
  state,
  week,
  doneCount,
  totalCount,
}: {
  state: AvatarState;
  week: SceneDay[];
  doneCount: number;
  totalCount: number;
}) {
  const fullQuality = useHasRealGpu();
  const doneRatio = totalCount > 0 ? doneCount / totalCount : 0;

  return (
    <Canvas
      shadows={fullQuality ? "soft" : false}
      dpr={fullQuality ? [1, 2] : 1}
      gl={{ antialias: true }}
      camera={{ position: [0, 0.15, 4.6], fov: 34 }}
      style={{ touchAction: "pan-y" }}
      aria-label="Your builder on the progress podium — drag to turn"
    >
      <Backdrop />

      {/* Image-based lighting: a procedural studio, PMREM'd by drei. */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={1.6} position={[0, 5, 3]} scale={[7, 3, 1]} color="#ffffff" />
        <Lightformer intensity={0.9} position={[-5, 2, 2]} scale={[3, 3, 1]} color="#eaf2ff" />
        <Lightformer intensity={1.1} position={[5, 3, -2]} scale={[3, 4, 1]} color="#e2ffe9" />
        <Lightformer intensity={0.7} position={[0, 2, -6]} scale={[10, 2, 1]} color="#d6e9ff" />
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

      {/* Grab-and-turn: rotates around the character's chest, springs back. */}
      <PresentationControls
        global
        cursor
        snap
        speed={1.4}
        polar={[-0.12, 0.22]}
        azimuth={[-Math.PI / 2.2, Math.PI / 2.2]}
      >
        <group position={[0, -1.02, 0]}>
          <Suspense fallback={null}>
            <Builder state={state} />
            <Podium week={week} doneRatio={doneRatio} />
            <BlobShadow position={[0, 0.012, 0]} scale={0.55} opacity={0.13} />
          </Suspense>
        </group>
      </PresentationControls>
    </Canvas>
  );
}
