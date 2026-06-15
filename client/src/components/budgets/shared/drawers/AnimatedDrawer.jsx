import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

export default function AnimatedDrawer({
  open,
  onClose,
  children,
  maxWidth = "max-w-7xl",
  fullScreen = false,
}) {
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`
              fixed
              inset-0
              z-[99999]
              bg-white
              shadow-2xl
              ${
                fullScreen
                  ? "w-screen h-screen"
                  : `right-0 top-0 h-screen w-full ${maxWidth}`
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
