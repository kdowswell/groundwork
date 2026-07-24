import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only repo-level suites; examples/ contains fixture apps whose test
    // files exist for the detector's no-tests posture rule, not for vitest.
    include: ["tests/**/*.test.ts", "eval/behavior/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
