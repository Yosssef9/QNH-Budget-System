import { useEffect } from "react";

export default function useEscapeKey(callback, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        callback(event);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [callback, enabled]);
}
