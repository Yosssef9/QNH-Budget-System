import { useEffect, useState, useCallback } from "react";
import { History, Copy, X } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "../ConfirmModal";
import LoadingSpinner from "../LoadingSpinner";

import CopyBudgetHistoryList from "./CopyBudgetHistoryList";
import CopyBudgetPreview from "./CopyBudgetPreview";

import {
  getApprovedBudgetHistory,
  getBudgetHistoryItems,
} from "../../api/budget.api";

import { mapBudgetHistoryItemToDraftRow } from "../../helpers/budgetRows.helper";
import CollapsiblePanelToggle from "../layout/CollapsiblePanelToggle";
import AnimatedDrawer from "./shared/drawers/AnimatedDrawer";

export default function CopyBudgetDrawer({
  open,
  onClose,
  onCopy,
  hasExistingItems = false,
}) {
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [items, setItems] = useState([]);

  const [loadingHistory, setLoadingHistory] = useState(false);

  const [loadingItems, setLoadingItems] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);

      const data = await getApprovedBudgetHistory();

      setBudgets(data || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load budget history",
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadBudgetItems = useCallback(async (budget) => {
    try {
      setLoadingItems(true);

      const data = await getBudgetHistoryItems(budget.id);

      setSelectedBudget(budget);
      setItems(data || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load budget preview",
      );
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    setSelectedBudget(null);
    setItems([]);
    setConfirmOpen(false);

    setPreviewOpen(true);
    setHistoryPanelOpen(true);

    if (budgets.length === 0) {
      loadHistory();
    }
  }, [open, loadHistory, budgets.length]);
  const handleCopy = () => {
    try {
      const mappedRows = items.map(mapBudgetHistoryItemToDraftRow);

      onCopy(mappedRows);

      toast.success(`${mappedRows.length} items copied successfully`);

      setConfirmOpen(false);
      onClose();
    } catch (error) {
      console.error(error);

      toast.error("Failed to copy budget items");
    }
  };

  return (
    <>
      <AnimatedDrawer open={open} onClose={onClose} fullScreen>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
                <History size={20} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Copy Budget Items
                </h2>

                <p className="text-sm text-slate-500">
                  Copy items from a previously approved budget
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner fill />
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              <div
                className={`
    relative
    border-r
    bg-white

    transition-all
    duration-300
    ease-out

    ${
      historyPanelOpen
        ? "w-[380px] opacity-100"
        : "w-0 opacity-0 overflow-hidden border-r-0 pointer-events-none"
    }
  `}
              >
                <CopyBudgetHistoryList
                  budgets={budgets}
                  selectedBudgetId={selectedBudget?.id}
                  onSelect={loadBudgetItems}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="border-b bg-white px-5 py-3">
                  <CollapsiblePanelToggle
                    isOpen={historyPanelOpen}
                    onToggle={() => setHistoryPanelOpen((prev) => !prev)}
                    openLabel="Hide History"
                    closeLabel="Show History"
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  {loadingItems ? (
                    <div className="h-full w-full p-5">
                      <LoadingSpinner fill />
                    </div>
                  ) : (
                    <CopyBudgetPreview
                      budget={selectedBudget}
                      items={items}
                      previewOpen={previewOpen}
                      onTogglePreview={() => setPreviewOpen((prev) => !prev)}
                    />
                  )}
                </div>

                <div
                  className="
    sticky
    bottom-0
    left-0
    right-0
    z-30

    border-t
    border-slate-200

    bg-white/95
    backdrop-blur-lg

    px-6
    py-4

    shadow-[0_-12px_40px_rgba(0,0,0,0.08)]
  "
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      {selectedBudget ? (
                        <>
                          <span className="font-semibold text-slate-700">
                            {items.length}
                          </span>{" "}
                          items ready to copy
                        </>
                      ) : (
                        "Select a budget to continue"
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedBudget || items.length === 0}
                      onClick={() => setConfirmOpen(true)}
                      className="
        inline-flex
        items-center
        gap-3

        rounded-2xl

        bg-gradient-to-r
        from-primary-600
        to-primary-700

        px-7
        py-3.5

        text-sm
        font-bold
        text-white

        shadow-lg
        shadow-primary-500/25

        transition-all
        duration-200

        hover:-translate-y-0.5
        hover:shadow-xl
        hover:shadow-primary-500/30

        disabled:cursor-not-allowed
        disabled:opacity-50
      "
                    >
                      <Copy size={18} />

                      <span>Copy {items.length} Items To Current Budget</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AnimatedDrawer>

      <ConfirmModal
        open={confirmOpen}
        title="Add budget items?"
        message={`This will add ${items.length} item${items.length !== 1 ? "s" : ""} from the selected budget to your current budget. Existing items will remain unchanged.`}
        confirmText="Add Items"
        cancelText="Cancel"
        danger={false}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCopy}
      />
    </>
  );
}
