import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // tests/quench/ holds the in-Foundry batches; Quench runs them, not Vitest.
    include: ["tests/**/*.test.js"],
    exclude: ["node_modules", "dist", "tests/quench"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["module/**/*.js"],
      exclude: ["module/setup/**", "module/config/**", "**/*.test.js"]
    },
    testTimeout: 5000,
    hookTimeout: 10000
  }
});
