import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Must run before any other module — loads .env from monorepo root
dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env"),
});
