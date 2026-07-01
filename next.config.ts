import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + fs assets that must be required from node_modules,
  // not bundled — bundling breaks its filesystem-backed dev database.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
