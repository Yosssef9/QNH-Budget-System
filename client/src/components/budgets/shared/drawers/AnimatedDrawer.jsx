import { AnimatePresence, motion } from "framer-motion";

export default function AnimatedDrawer({
  open,
  onClose,
  children,
  maxWidth = "max-w-7xl",
}) {
  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[3px]"
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
              right-0
              top-0
              z-[9999]
              h-screen
              w-full
              ${maxWidth}
              bg-white
              shadow-2xl
            `}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
