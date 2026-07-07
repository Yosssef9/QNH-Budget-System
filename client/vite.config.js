import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@qnh/permissions": fileURLToPath(
        new URL("../shared/permissions/permissionCodes.js", import.meta.url),
      ),
    },
  },

  server: {
    fs: {
      allow: [".."],
    },
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/docs/**",
        "**/*.zip",
        "**/logs/**",
      ],
    },
  },
});
