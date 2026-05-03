/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Cairo",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        arabic: ["Cairo", "Inter", "system-ui", "sans-serif"],
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
          bg: "#f8fafc",
          surface: "#ffffff",
          border: "#e5edf5",
          muted: "#94a3b8",
          text: "#334155",
          soft: "#f9fbfd",
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

      letterSpacing: {
        tight: "-0.01em",
        normal: "0",
        wide: "0.02em",
      },

      boxShadow: {
        card: "0 6px 18px rgba(15, 23, 42, 0.035)",
        soft: "0 3px 10px rgba(15, 23, 42, 0.03)",
      },

      borderRadius: {
        card: "14px",
        panel: "18px",
      },
    },
  },

  plugins: [],
};
