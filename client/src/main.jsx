import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { Toaster } from "react-hot-toast";

AuthProvider;
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 999999,
        }}
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "14px",
            padding: "12px 16px",
            background: "#ffffff",
            color: "#0f172a",
            fontSize: "13.5px",
            fontWeight: 500,
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)",
          },

          success: {
            duration: 2500,
            style: {
              borderLeft: "4px solid #16a34a",
              background: "#f0fdf4",
              color: "#065f46",
            },
            iconTheme: {
              primary: "#16a34a",
              secondary: "#ecfdf5",
            },
          },

          error: {
            duration: 4000,
            style: {
              borderLeft: "4px solid #dc2626",
              background: "#fef2f2",
              color: "#7f1d1d",
            },
            iconTheme: {
              primary: "#dc2626",
              secondary: "#fef2f2",
            },
          },

          loading: {
            style: {
              borderLeft: "4px solid #2563eb",
              background: "#eff6ff",
              color: "#1e3a8a",
            },
          },
        }}
      />
    </AuthProvider>
  </StrictMode>,
);
