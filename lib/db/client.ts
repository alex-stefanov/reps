import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import path from "node:path";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Driver switch: DATABASE_URL → Neon serverless Postgres (production);
 * unset → embedded PGlite persisted in .pglite/ (local dev, e2e tests).
 * Same Postgres dialect and schema either way, so nothing above this file
 * knows or cares which driver is active.
 */
async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const dataDir =
    process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".pglite", "data");
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  // Keep the embedded dev DB schema current without a manual migrate step.
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "lib", "db", "migrations"),
  });
  return db as unknown as Db;
}

// Survive Next.js dev-server module reloads without re-opening PGlite
// (a second PGlite handle on the same data dir would fail).
const globalForDb = globalThis as unknown as { __repsDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__repsDb ??= createDb();
  return globalForDb.__repsDb;
}
