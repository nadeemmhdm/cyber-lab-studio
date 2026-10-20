import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration suites share the same SQLite database. Running test files
    // concurrently can leak platform settings/fixtures across suites, so keep
    // file execution serial while preserving deterministic test ordering.
    fileParallelism: false,
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
