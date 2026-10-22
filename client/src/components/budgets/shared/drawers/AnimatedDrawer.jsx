import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

export default function AnimatedDrawer({
  open,
  onClose,
  children,
  maxWidth = "max-w-7xl",
  fullScreen = false,
  side,
}) {
  // Keep existing narrow-drawer placement on the left unless a caller
  // specifies otherwise. Full-screen workspaces continue to enter from right.
  const drawerSide = side === "left" || side === "right"
    ? side
    : fullScreen ? "right" : "left";
  const offscreenX = drawerSide === "left" ? "-100%" : "100%";
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[99998] bg-black/40"
          />

          <motion.div
            initial={{ x: offscreenX }}
            animate={{ x: 0 }}
            exit={{ x: offscreenX }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`
              fixed
              z-[99999]
              bg-white
              shadow-2xl
              ${
                fullScreen
                  ? "inset-0 h-screen w-screen"
                  : `inset-y-0 ${drawerSide === "left" ? "left-0" : "right-0"} h-screen w-full ${maxWidth}`
              }
            `}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

