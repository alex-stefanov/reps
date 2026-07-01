import { rmSync } from "node:fs";
import path from "node:path";

/** Every e2e run starts from an empty database. */
export default function globalSetup(): void {
  rmSync(path.join(process.cwd(), ".pglite-e2e"), {
    recursive: true,
    force: true,
  });
}
