import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + fs assets that must be required from node_modules,
  // not bundled — bundling breaks its filesystem-backed dev database.
  serverExternalPackages: ["@electric-sql/pglite"],
  // E2E runs its own dev server alongside yours; a separate dist dir keeps
  // Next's one-dev-server-per-project lock out of the way.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: ["127.0.0.1"],
  // Receipt-scan images (base64) exceed the 1 MB server-action default.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
