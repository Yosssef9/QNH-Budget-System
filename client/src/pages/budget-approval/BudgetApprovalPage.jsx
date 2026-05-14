import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  RotateCcw,
  Eye,
  Loader2,
  ClipboardCheck,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import {
  useApproveBudget,
  useBudgetReview,
  usePendingBudgetApprovals,
  useReturnBudget,
} from "../../hooks/budgets/useBudgetApproval";
import { formatSAR } from "../../utils/formatters";
import ReadonlyBudgetGrid from "./ReadonlyBudgetGrid";
import BudgetComparison from "./BudgetComparison";
import ApprovalReviewFeedbackPanel from "./ApprovalReviewFeedbackPanel";
import { scrollToBudgetItemRow } from "../../helpers/budgetReviewNavigation.helper";

export default function BudgetApprovalPage() {
  const [activeTab, setActiveTab] = useState("REVIEW");
  const [isPendingPanelOpen, setIsPendingPanelOpen] = useState(true);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [generalNote, setGeneralNote] = useState("");
  const [itemNotes, setItemNotes] = useState({});
  const [actionType, setActionType] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const {
    data: pendingBudgets = [],
    isLoading: loadingPending,
    isError: pendingError,
  } = usePendingBudgetApprovals();

  const {
    data: reviewData,
    isLoading: loadingReview,
    isError: reviewError,
  } = useBudgetReview(selectedBudgetId);

  const selectedBudget = reviewData?.budget;
  const items = reviewData?.items || [];

  const approveMutation = useApproveBudget();
  const returnMutation = useReturnBudget();

  const isSubmitting = approveMutation.isPending || returnMutation.isPending;

  function resetReview() {
    setSelectedBudgetId(null);
    setGeneralNote("");
    setItemNotes({});
    setActionType(null);
  }

  function handleSelectBudget(budgetId) {
    setSelectedBudgetId(budgetId);
    setGeneralNote("");
    setItemNotes({});
    setActionType(null);
  }

  function getPayload() {
    return {
      generalNote,
      itemNotes: Object.entries(itemNotes)
        .filter(([, note]) => note?.trim())
        .map(([budgetItemId, note]) => ({
          budgetItemId: Number(budgetItemId),
          note: note.trim(),
        })),
    };
  }

  function handleApprove() {
    if (!selectedBudgetId) return;

    setActionType("APPROVE");

    approveMutation.mutate(
      {
        budgetId: selectedBudgetId,
        payload: getPayload(),
      },
      {
        onSuccess: () => {
          toast.success("Budget approved successfully");
          resetReview();
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message || "Failed to approve budget",
          );
        },
      },
    );
  }

  function handleReturn() {
    if (!selectedBudgetId) return;

    if (!generalNote.trim()) {
      toast.error("General return note is required");
      return;
    }

    setActionType("RETURN");

    returnMutation.mutate(
      {
        budgetId: selectedBudgetId,
        payload: getPayload(),
      },
      {
        onSuccess: () => {
          toast.success("Budget returned successfully");
          resetReview();
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message || "Failed to return budget",
          );
        },
      },
    );
  }

  function handleItemNoteChange(itemId, value) {
    setItemNotes((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ClipboardCheck size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Budget Approvals
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review submitted budgets and compare budget usage across
              departments.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("REVIEW")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "REVIEW"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Eye size={16} />
            Pending Review
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPARISON")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "COMPARISON"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BarChart3 size={16} />
            Budget Comparison
          </button>
        </div>
      </div>

      {activeTab === "COMPARISON" && <BudgetComparison />}

      {activeTab === "REVIEW" && (
        <motion.div
          layout
          className="grid min-w-0 gap-6 xl:grid-cols-[auto_minmax(0,1fr)]"
          transition={{ duration: 0.28, ease: "easeInOut" }}
        >
          <AnimatePresence initial={false}>
            {isPendingPanelOpen && (
              <motion.section
                key="pending-budget-sidebar"
                layout
                initial={{ width: 0, opacity: 0, x: -18 }}
                animate={{ width: 380, opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: -18 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Pending Budgets
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a budget to review.
                  </p>
                </div>

                <div className="max-h-[720px] overflow-y-auto p-4">
                  {loadingPending && (
                    <div className="flex items-center justify-center py-16 text-slate-500">
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      Loading pending budgets...
                    </div>
                  )}

                  {pendingError && (
                    <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                      Failed to load pending budgets.
                    </div>
                  )}

                  {!loadingPending && pendingBudgets.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No pending budgets found.
                    </div>
                  )}

                  <div className="space-y-3">
                    {pendingBudgets.map((budget) => {
                      const active = selectedBudgetId === budget.id;

                      return (
                        <button
                          key={budget.id}
                          type="button"
                          onClick={() => handleSelectBudget(budget.id)}
                          className={[
                            "w-full rounded-2xl border p-4 text-left transition-all",
                            active
                              ? "border-blue-300 bg-blue-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-bold text-slate-900">
                                {budget.department_name}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Financial Year {budget.financial_year}
                              </p>
                            </div>

                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              Pending
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-slate-500">Items</p>
                              <p className="mt-1 font-bold text-slate-900">
                                {budget.items_count}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-slate-500">Total</p>
                              <p className="mt-1 font-bold text-slate-900">
                                {formatSAR(budget.total_amount)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-700">
                            <Eye size={14} />
                            Review budget
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
          <motion.section
            layout
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            {!selectedBudgetId && (
              <div className="flex min-h-[520px] items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-blue-700">
                    <Eye size={28} />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-slate-900">
                    Select a budget
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose a pending budget from the left side to view it using
                    the same detailed structure as the budget entry screen.
                  </p>
                </div>
              </div>
            )}

            {selectedBudgetId && loadingReview && (
              <div className="flex min-h-[520px] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={20} />
                Loading budget review...
              </div>
            )}

            {selectedBudgetId && reviewError && (
              <div className="p-6">
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  Failed to load budget review.
                </div>
              </div>
            )}

            {selectedBudget && !loadingReview && (
              <div className="space-y-6 p-6">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsPendingPanelOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    {isPendingPanelOpen ? (
                      <>
                        <PanelLeftClose size={17} />
                        Hide Pending List
                      </>
                    ) : (
                      <>
                        <PanelLeftOpen size={17} />
                        Show Pending List
                      </>
                    )}
                  </button>
                </div>
                <ApprovalReviewFeedbackPanel
                  budgetId={selectedBudgetId}
                  onItemNoteClick={scrollToBudgetItemRow}
                />
                <ReadonlyBudgetGrid
                  budget={selectedBudget}
                  items={items}
                  showNotes
                  itemNotes={itemNotes}
                  onItemNoteChange={handleItemNoteChange}
                />

                <div>
                  <label className="text-sm font-bold text-slate-900">
                    General Note
                  </label>
                  <textarea
                    value={generalNote}
                    onChange={(e) => setGeneralNote(e.target.value)}
                    rows={4}
                    placeholder="Required when returning. Optional when approving."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!generalNote.trim()) {
                        toast.error("General return note is required");
                        return;
                      }

                      setConfirmAction("RETURN");
                    }}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting && actionType === "RETURN" ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <RotateCcw size={18} />
                    )}
                    Return with Notes
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmAction("APPROVE")}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting && actionType === "APPROVE" ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    Approve Budget
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
      <ConfirmModal
        open={confirmAction === "APPROVE"}
        title="Approve budget?"
        message="Are you sure you want to approve this budget? After approval, the budget will be locked and used for tracking."
        confirmText="Approve"
        loading={approveMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          handleApprove();
        }}
      />

      <ConfirmModal
        open={confirmAction === "RETURN"}
        danger
        title="Return budget?"
        message="Are you sure you want to return this budget to the department? The HOD will need to update it and resubmit."
        confirmText="Return Budget"
        loading={returnMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          handleReturn();
        }}
      />
    </div>
  );
}
