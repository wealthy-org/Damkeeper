#!/usr/bin/env node

// When installed globally via npm, run the pre-built bundle.
// When run from a repo checkout, fall back to tsx for live TypeScript.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist", "index.js");

if (existsSync(dist)) {
  // Production: run compiled bundle (no tsx needed)
  await import(dist);
} else {
  // Development: use tsx to run TypeScript source directly
  const { register } = await import("tsx/esm/api");
  register({ tsconfig: join(root, "tsconfig.json") });
  await import(join(root, "src", "index.ts"));
}
