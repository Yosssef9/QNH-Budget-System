import { createContext, useCallback, useContext, useEffect, useId, useRef } from "react";
import { useBlocker } from "react-router-dom";

const CategoryBackContext = createContext(null);

/**
 * Category Manager uses real, route-level navigation blocking instead of fake
 * history entries. An in-app Back/POP closes the topmost open overlay first.
 * Normal navigation is untouched once all overlays have closed.
 */
export function CategoryBackNavigationProvider({ children }) {
  const openOverlays = useRef(new Map());
  const nextSequence = useRef(0);

  const register = useCallback((id, close) => {
    const entry = { sequence: ++nextSequence.current, close };
    openOverlays.current.set(id, entry);
    return () => {
      if (openOverlays.current.get(id) === entry) {
        openOverlays.current.delete(id);
      }
    };
  }, []);

  const blocker = useBlocker(({ historyAction }) =>
    historyAction === "POP" && openOverlays.current.size > 0,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const top = [...openOverlays.current.values()].reduce(
      (latest, entry) =>
        !latest || entry.sequence > latest.sequence ? entry : latest,
      null,
    );
    // Cancel the attempted Back navigation. We do not mutate the URL, page
    // filters, scroll position, or underlying history entry.
    blocker.reset();
    top?.close();
  }, [blocker]);

  return (
    <CategoryBackContext.Provider value={register}>
      {children}
    </CategoryBackContext.Provider>
  );
}

/** Register an existing drawer/confirmation without changing its X/onClose API. */
export function useCategoryBackOverlay(open, onClose) {
  const register = useContext(CategoryBackContext);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || !register) return undefined;
    return register(id, () => closeRef.current?.());
  }, [id, open, register]);
}
