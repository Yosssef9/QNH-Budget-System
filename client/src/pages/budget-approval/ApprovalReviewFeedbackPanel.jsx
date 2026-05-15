import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronUp,
  ClipboardList,
  History,
  MousePointerClick,
} from "lucide-react";

import { useBudgetReviewFeedback } from "../../hooks/budgets/useBudgetReviewFeedback";
import { formatDateTime } from "../../utils/dateFormatters";

export default function ApprovalReviewFeedbackPanel({
  budgetId,
  onItemNoteClick,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneralOpen, setIsGeneralOpen] = useState(false);
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const { data, isLoading, isError } = useBudgetReviewFeedback(budgetId);

  const generalNotes = data?.generalNotes || [];
  const itemNotes = data?.itemNotes || [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
        Loading previous review notes...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        Failed to load previous review notes.
      </div>
    );
  }

  if (generalNotes.length === 0 && itemNotes.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-amber-700">
            <History size={23} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-amber-900">
              Previous Review Notes
            </h2>
            <p className="mt-1 text-sm font-medium text-amber-800">
              Compare previous approver notes with the current submitted budget.
            </p>
          </div>
        </div>

        <CollapseBadge isOpen={isOpen} openText="Hide" closedText="Show" />
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
            <div className="space-y-4 border-t border-amber-200 p-5">
              {generalNotes.length > 0 && (
                <div className="overflow-hidden rounded-2xl bg-white">
                  <button
                    type="button"
                    onClick={() => setIsGeneralOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <ClipboardList size={16} />
                      General Notes
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        {generalNotes.length}
                      </span>
                    </h3>

                    <CollapseBadge
                      isOpen={isGeneralOpen}
                      openText="Collapse"
                      closedText="Open"
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isGeneralOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 border-t border-slate-100 p-4">
                          {generalNotes.map((note) => (
                            <div
                              key={note.id}
                              className="rounded-xl border border-amber-100 bg-amber-50/60 p-3"
                            >
                              <p className="text-sm font-semibold text-slate-800">
                                {note.note}
                              </p>
                              <p className="mt-2 text-xs font-medium text-slate-500">
                                By {note.created_by_name || "Approver"} ·{" "}
                                {note.created_at
                                  ? formatDateTime(note.created_at)()
                                  : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {itemNotes.length > 0 && (
                <div className="overflow-hidden rounded-2xl bg-white">
                  <button
                    type="button"
                    onClick={() => setIsItemsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <AlertTriangle size={16} />
                      Item Notes
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        {itemNotes.length}
                      </span>
                    </h3>

                    <CollapseBadge
                      isOpen={isItemsOpen}
                      openText="Collapse"
                      closedText="Open"
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isItemsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-3">
                          {itemNotes.map((note) => {
                            return (
                              <button
                                key={note.id}
                                type="button"
                                onClick={() => {
                                  onItemNoteClick?.(note.budget_item_id);
                                }}
                                className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left transition-all duration-200 hover:border-amber-300 hover:bg-amber-100"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                      {note.category_name || "Category"}
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                      {note.type_name || "Budget Item"}
                                    </p>
                                  </div>

                                  <MousePointerClick
                                    size={16}
                                    className="shrink-0 text-amber-700"
                                  />
                                </div>

                                <p className="mt-3 text-sm font-semibold text-red-700">
                                  {note.note}
                                </p>

                                <p className="mt-3 text-xs font-medium text-slate-500">
                                  By {note.created_by_name || "Approver"} ·{" "}
                                  {note.created_at
                                    ? formatDateTime(note.created_at)
                                    : ""}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CollapseBadge({ isOpen, openText, closedText }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-amber-700">
      <motion.div
        animate={{ rotate: isOpen ? 0 : 180 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronUp size={16} />
      </motion.div>

      {isOpen ? openText : closedText}
    </div>
  );
}
