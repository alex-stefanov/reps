"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * A soft radial-gradient shadow disc — sells grounding at ~zero GPU cost,
 * so the scene stays at 60fps even on integrated/software GL. Real shadow
 * maps are deliberately not used anywhere.
 */
export function BlobShadow({
  position = [0, 0.002, 0] as [number, number, number],
  scale = 1,
  opacity = 0.28,
}: {
  position?: [number, number, number];
  scale?: number;
  opacity?: number;
}) {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, "rgba(20,24,28,1)");
    grad.addColorStop(0.55, "rgba(20,24,28,0.45)");
    grad.addColorStop(1, "rgba(20,24,28,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
