import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function useLockToast(locked, message) {
  const shownRef = useRef(false);

  useEffect(() => {
    if (!locked || !message || shownRef.current) return;

    toast.error(message);

    shownRef.current = true;
  }, [locked, message]);
}
