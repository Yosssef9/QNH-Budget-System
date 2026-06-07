import { useEffect } from "react";

export default function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function listener(event) {
      const element = ref?.current;

      if (!element) return;

      if (element.contains(event.target)) {
        return;
      }

      handler(event);
    }

    document.addEventListener("mousedown", listener);

    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);

      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}
