import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";

export default function CollapsibleSection({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
  openText = "Hide",
  closedText = "Show",
  className = "",
  headerClassName = "",
  titleClassName = "text-slate-900",
  descriptionClassName = "text-slate-500",
  bodyClassName = "",
  badgeClassName = "",
  iconClassName = "bg-white text-blue-700",
  action,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-4 p-5 text-left ${headerClassName}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className={`rounded-2xl p-3 ${iconClassName}`}>{icon}</div>
          )}

          <div className="min-w-0">
            <h2 className={`truncate text-lg font-bold ${titleClassName}`}>
              {title}
            </h2>

            {description && (
              <p className={`mt-1 text-sm font-medium ${descriptionClassName}`}>
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {action}

          <div
            className={`flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 ${badgeClassName}`}
          >
            <motion.div
              animate={{ rotate: isOpen ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp size={16} />
            </motion.div>

            {isOpen ? openText : closedText}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={`border-t border-slate-200 p-5 ${bodyClassName}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
