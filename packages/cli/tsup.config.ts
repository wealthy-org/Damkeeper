import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  splitting: false,
  clean: true,
  sourcemap: false,
  banner: {
    js: "// @damkeeper/cli — bundled for standalone distribution",
  },
});
