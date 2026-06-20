import { useMemo, useState } from "react";
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
  PanelRightOpen,
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import {
  useApproveBudget,
  useBudgetReview,
  usePendingBudgetApprovals,
  useReturnBudget,
  useApprovedBudgetApprovals,
} from "../../hooks/budgets/useBudgetApproval";
import BudgetApprovalSidebar from "../../components/budgets/BudgetApprovalSidebar";
import ReadonlyBudgetGrid from "./ReadonlyBudgetGrid";

import ApprovalReviewFeedbackPanel from "./ApprovalReviewFeedbackPanel";
import { scrollToBudgetItemRow } from "../../helpers/budgetReviewNavigation.helper";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../theme/statusStyles";
import BudgetTimeline from "../../components/BudgetTimeline";
import CollapsiblePanelToggle from "../../components/layout/CollapsiblePanelToggle";
export default function BudgetApprovalPage() {
  const [activeTab, setActiveTab] = useState("REVIEW");
  const [isPendingPanelOpen, setIsPendingPanelOpen] = useState(true);
  const [isApprovedPanelOpen, setIsApprovedPanelOpen] = useState(true);
  const [pendingSearch, setPendingSearch] = useState("");
  const [approvedSearch, setApprovedSearch] = useState("");
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [generalNote, setGeneralNote] = useState("");
  const [itemNotes, setItemNotes] = useState({});
  const [actionType, setActionType] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isPendingTimelineOpen, setIsPendingTimelineOpen] = useState(false);

  const [isApprovedTimelineOpen, setIsApprovedTimelineOpen] = useState(false);
  const [selectedApprovedBudgetId, setSelectedApprovedBudgetId] =
    useState(null);
  const {
    data: approvedBudgets = [],
    isLoading: loadingApproved,
    isError: approvedError,
  } = useApprovedBudgetApprovals();
  const filteredApprovedBudgets = useMemo(() => {
    const search = approvedSearch.trim().toLowerCase();

    if (!search) return approvedBudgets;

    return approvedBudgets.filter((budget) =>
      [
        budget.department_name,
        budget.financial_year,
        budget.items_count,
        budget.total_amount,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [approvedBudgets, approvedSearch]);
  const {
    data: approvedReviewData,
    isLoading: loadingApprovedReview,
    isError: approvedReviewError,
  } = useBudgetReview(selectedApprovedBudgetId);

  const approvedBudget = approvedReviewData?.budget;
  const approvedItems = approvedReviewData?.items || [];
  const {
    data: pendingBudgets = [],
    isLoading: loadingPending,
    isError: pendingError,
  } = usePendingBudgetApprovals();
  const filteredPendingBudgets = useMemo(() => {
    const search = pendingSearch.trim().toLowerCase();

    if (!search) return pendingBudgets;

    return pendingBudgets.filter((budget) =>
      [
        budget.department_name,
        budget.financial_year,
        budget.items_count,
        budget.total_amount,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [pendingBudgets, pendingSearch]);
  const {
    data: reviewData,
    isLoading: loadingReview,
    isError: reviewError,
  } = useBudgetReview(selectedBudgetId);

  const selectedBudget = reviewData?.budget;
  const items = reviewData?.items || [];
  const priceIntelligenceSummary = reviewData?.priceIntelligenceSummary;

  const approveMutation = useApproveBudget();
  const returnMutation = useReturnBudget();

  const isSubmitting = approveMutation.isPending || returnMutation.isPending;

  function resetReview() {
    setSelectedBudgetId(null);
    setGeneralNote("");
    setItemNotes({});
    setActionType(null);
    setIsPendingPanelOpen(true);
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
            onClick={() => {
              setActiveTab("REVIEW");
              setIsApprovedTimelineOpen(false);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "REVIEW"
                ? "bg-white text-amber-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Eye size={16} />
            Pending Review
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("APPROVED");
              setIsPendingTimelineOpen(false);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "APPROVED"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CheckCircle2 size={16} />
            Approved Budgets
          </button>
        </div>
      </div>
      {activeTab === "APPROVED" && (
        <div
          className={[
            "grid min-w-0 gap-6 transition-all duration-300 ease-in-out",
            isApprovedPanelOpen
              ? "xl:grid-cols-[380px_minmax(0,1fr)]"
              : "xl:grid-cols-[0px_minmax(0,1fr)]",
          ].join(" ")}
        >
          {" "}
          <BudgetApprovalSidebar
            title="Approved Budgets"
            description="View approved budgets in read-only mode."
            searchValue={approvedSearch}
            onSearchChange={setApprovedSearch}
            searchPlaceholder="Search approved budgets..."
            budgets={filteredApprovedBudgets}
            loading={loadingApproved}
            error={approvedError}
            selectedBudgetId={selectedApprovedBudgetId}
            onSelectBudget={setSelectedApprovedBudgetId}
            statusLabel={getBudgetStatusLabel("APPROVED")}
            statusColorClasses={getBudgetStatusStyle("APPROVED").badge}
            activeCardClasses={getBudgetStatusStyle("APPROVED").activeCard}
            inactiveCardClasses={getBudgetStatusStyle("APPROVED").inactiveCard}
            footerText="View approved budget"
          />
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <CollapsiblePanelToggle
                isOpen={isApprovedPanelOpen}
                onToggle={() => setIsApprovedPanelOpen((prev) => !prev)}
                openLabel="Show Approved"
                closeLabel="Hide Approved"
              />
            </div>
            {!selectedApprovedBudgetId && (
              <div className="flex min-h-[520px] items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={28} />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-slate-900">
                    Select approved budget
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose an approved budget from the left side to view it in
                    read-only mode.
                  </p>
                </div>
              </div>
            )}

            {selectedApprovedBudgetId && loadingApprovedReview && (
              <div className="flex min-h-[520px] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={20} />
                Loading approved budget...
              </div>
            )}

            {selectedApprovedBudgetId && approvedReviewError && (
              <div className="p-6">
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  Failed to load approved budget.
                </div>
              </div>
            )}

            {approvedBudget && !loadingApprovedReview && (
              <div
                className={`grid gap-6 p-6 transition-all duration-300 ${
                  isApprovedTimelineOpen
                    ? "xl:grid-cols-[minmax(0,1fr)_380px]"
                    : "grid-cols-1"
                }`}
              >
                <div className="min-w-0">
                  <ReadonlyBudgetGrid
                    budget={approvedBudget}
                    items={approvedItems}
                    showNotes={false}
                  />
                </div>

                <AnimatePresence mode="wait">
                  {isApprovedTimelineOpen && (
                    <motion.div
                      initial={{
                        width: 0,
                        opacity: 0,
                      }}
                      animate={{
                        width: 380,
                        opacity: 1,
                      }}
                      exit={{
                        width: 0,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.25,
                        ease: "easeInOut",
                      }}
                      className="hidden xl:block overflow-hidden"
                    >
                      <div className="sticky top-6 h-[calc(100vh-120px)]">
                        <BudgetTimeline
                          budgetId={selectedApprovedBudgetId}
                          isOpen={isApprovedTimelineOpen}
                          onToggle={() =>
                            setIsApprovedTimelineOpen((prev) => !prev)
                          }
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {approvedBudget && !isApprovedTimelineOpen && (
              <button
                type="button"
                onClick={() => setIsApprovedTimelineOpen(true)}
                className="
      fixed bottom-6 right-6 z-40
      flex items-center gap-2
      rounded-2xl border border-slate-200
      bg-white px-4 py-3 shadow-xl
      transition hover:scale-105
    "
              >
                <PanelRightOpen size={18} />

                <span className="text-sm font-semibold">Timeline</span>
              </button>
            )}
          </section>
        </div>
      )}

      {activeTab === "REVIEW" && (
        <div
          className={[
            "grid min-w-0 gap-6 transition-all duration-300 ease-in-out",
            isPendingPanelOpen
              ? "xl:grid-cols-[380px_minmax(0,1fr)]"
              : "xl:grid-cols-[0px_minmax(0,1fr)]",
          ].join(" ")}
        >
          <BudgetApprovalSidebar
            title="Pending Budgets"
            description="Select a budget to review."
            searchValue={pendingSearch}
            onSearchChange={setPendingSearch}
            searchPlaceholder="Search pending budgets..."
            budgets={filteredPendingBudgets}
            loading={loadingPending}
            error={pendingError}
            selectedBudgetId={selectedBudgetId}
            onSelectBudget={handleSelectBudget}
            statusLabel={getBudgetStatusLabel("PENDING_APPROVAL")}
            statusColorClasses={getBudgetStatusStyle("PENDING_APPROVAL").badge}
            activeCardClasses={
              getBudgetStatusStyle("PENDING_APPROVAL").activeCard
            }
            inactiveCardClasses={
              getBudgetStatusStyle("PENDING_APPROVAL").inactiveCard
            }
            footerText="Review budget"
          />
          <motion.section
            layout
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 p-4">
              <CollapsiblePanelToggle
                isOpen={isPendingPanelOpen}
                onToggle={() => setIsPendingPanelOpen((prev) => !prev)}
                openLabel="Show Pending List"
                closeLabel="Hide Pending List"
              />
            </div>
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
              <div
                className={`grid gap-6 p-6 transition-all duration-300 ${
                  isPendingTimelineOpen
                    ? "xl:grid-cols-[minmax(0,1fr)_380px]"
                    : "grid-cols-1"
                }`}
              >
                <div className="min-w-0 space-y-6">
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
                    priceIntelligenceSummary={priceIntelligenceSummary}
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

                <AnimatePresence mode="wait">
                  {isPendingTimelineOpen && (
                    <motion.div
                      initial={{
                        width: 0,
                        opacity: 0,
                      }}
                      animate={{
                        width: 380,
                        opacity: 1,
                      }}
                      exit={{
                        width: 0,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.25,
                        ease: "easeInOut",
                      }}
                      className="hidden xl:block overflow-hidden"
                    >
                      <div className="sticky top-6 h-[calc(100vh-120px)]">
                        <BudgetTimeline
                          budgetId={selectedBudgetId}
                          isOpen={isPendingTimelineOpen}
                          onToggle={() =>
                            setIsPendingTimelineOpen((prev) => !prev)
                          }
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!isPendingTimelineOpen && (
                  <button
                    type="button"
                    onClick={() => setIsPendingTimelineOpen(true)}
                    className="
      fixed bottom-6 right-6 z-40
      flex items-center gap-2
      rounded-2xl border border-slate-200
      bg-white px-4 py-3 shadow-xl
      transition hover:scale-105
    "
                  >
                    <PanelRightOpen size={18} />

                    <span className="text-sm font-semibold">Timeline</span>
                  </button>
                )}
              </div>
            )}
          </motion.section>
        </div>
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
