import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + fs assets that must be required from node_modules,
  // not bundled — bundling breaks its filesystem-backed dev database.
  serverExternalPackages: ["@electric-sql/pglite"],
  // E2E runs its own dev server alongside yours; a separate dist dir keeps
  // Next's one-dev-server-per-project lock out of the way.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
