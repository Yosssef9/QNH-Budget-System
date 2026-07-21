import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

function normalizeBasePath(value) {
  const basePath = value?.trim() || "/";

  const withLeadingSlash = basePath.startsWith("/")
    ? basePath
    : `/${basePath}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  /*
    loadEnv is necessary because APP_BASE_PATH and
    DEV_API_PROXY_TARGET are used inside vite.config.js.
  */
  const env = loadEnv(mode, process.cwd(), "");

  const base = normalizeBasePath(env.APP_BASE_PATH);

  const devApiProxyTarget =
    env.DEV_API_PROXY_TARGET?.trim() ||
    "http://127.0.0.1:6000";

  /*
    In your architecture, production calls the Budget backend
    on port 6000, not QNH Portal's own /api routes.

    Therefore, fail the production build when the API URL
    was not configured instead of silently calling the wrong API.
  */
  if (
    mode === "production" &&
    !env.VITE_API_BASE_URL?.trim()
  ) {
    throw new Error(
      "VITE_API_BASE_URL is required for the production build.",
    );
  }

  return {
    /*
      Development:
        /

      Production:
        /budget-system/
    */
    base,

    plugins: [react()],

    resolve: {
      alias: {
        "@qnh/permissions": fileURLToPath(
          new URL(
            "../shared/permissions/permissionCodes.js",
            import.meta.url,
          ),
        ),
      },
    },

    server: {
      fs: {
        allow: [".."],
      },

      /*
        Development only:

        Browser:
          http://localhost:5173/api/...

        Vite forwards it to:
          http://127.0.0.1:6000/api/...
      */
      proxy: {
        "/api": {
          target: devApiProxyTarget,
          changeOrigin: true,
        },
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
  };
});