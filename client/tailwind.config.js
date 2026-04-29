/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Cairo", "system-ui", "sans-serif"],
        arabic: ["Cairo", "Inter", "sans-serif"],
      },

      colors: {
        primary: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#b9ddff",
          300: "#88c8ff",
          400: "#50a9f5",
          500: "#2388d7",
          600: "#1562A0",
          700: "#124f82",
          800: "#13446c",
          900: "#123957",
        },

        enterprise: {
          bg: "#f5f7fb",
          surface: "#ffffff",
          border: "#d9e2ec",
          muted: "#64748b",
          text: "#0f172a",
          soft: "#f8fafc",
        },

        success: {
          50: "#ecfdf5",
          600: "#059669",
          700: "#047857",
        },

        warning: {
          50: "#fffbeb",
          600: "#d97706",
          700: "#b45309",
        },

        danger: {
          50: "#fef2f2",
          600: "#dc2626",
          700: "#b91c1c",
        },

        info: {
          50: "#eff6ff",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },

      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.06)",
        soft: "0 8px 20px rgba(15, 23, 42, 0.05)",
      },

      borderRadius: {
        card: "18px",
        panel: "22px",
      },
    },
  },

  plugins: [],
};