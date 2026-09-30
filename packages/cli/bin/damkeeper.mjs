#!/usr/bin/env node
import { register } from "tsx/esm/api";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
register({ tsconfig: join(root, "tsconfig.json") });
await import(join(root, "src", "index.ts"));
