/**
 * Applies generated migrations to the Neon database pointed at by DATABASE_URL.
 * (PGlite dev databases migrate themselves on first connection — see client.ts.)
 *
 * Usage: DATABASE_URL=postgres://... npm run db:migrate
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required (PGlite dev DBs self-migrate).");
    process.exit(1);
  }
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  console.log("Migrations applied.");
}

main();
