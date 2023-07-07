import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      clipboardy: "<rootDir>/__tests__/helpers/clipboardy-mock.js",
      "miniflare/cli": "<rootDir>/../node_modules/miniflare/dist/src/cli.js",
    },
    restoreMocks: true,
    setupFiles: "./vitest.setup.ts",
    testTimeout: 50000,
    isolate: true,
  },
});
