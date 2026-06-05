import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    setupFiles: ["./tests/setup/testSetup.js"],

    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});
