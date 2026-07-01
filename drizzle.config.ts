import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Only needed for `drizzle-kit migrate/push` against Neon;
    // `generate` works without it, and PGlite migrates itself on boot.
    url: process.env.DATABASE_URL ?? "postgres://unused",
  },
});
