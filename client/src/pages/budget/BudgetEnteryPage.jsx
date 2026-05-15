import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
} from "lucide-react";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
} from "../../theme/statusStyles";

import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import ConfirmModal from "../../components/ConfirmModal";
import Breadcrumbs from "../../components/Breadcrumbs";
import RequestBudgetItemModal from "../../components/budgets/RequestBudgetItemModal";
import { useCreateBudgetManual } from "../../hooks/budgets/useCreateBudgetManual";
import BudgetReviewFeedback from "../../components/budgets/BudgetReviewFeedback";
import { useBudgetReviewFeedback } from "../../hooks/budgets/useBudgetReviewFeedback";
import { MONTHS as months } from "../../constants/months.constants";
import { BUDGET_METHOD_OPTIONS as methodOptions } from "../../constants/budgetMethodOptions.constants";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { formatNumber } from "../../utils/formatters";
import CurrencyText from "../../components/CurrencyText";
import { toNumber } from "../../utils/number";
import {
  getMonthlyDistribution,
  getQuarterlyDistribution,
  getDistributedQuantity,
  getQuarterAmount,
  normalizeArray,
} from "../../helpers/budgetCalculations.helper";
import { scrollToBudgetItemRow } from "../../helpers/budgetReviewNavigation.helper";
import {
  getApiDistributionMethod,
  getApiDistributionLevel,
  getApiDistributionRows,
} from "../../helpers/budgetPayload.helper";

import {
  getDuplicateTypeRowIds,
  validateRowsDetailed,
} from "../../helpers/budgetValidation.helper";
import { useSubmitBudget } from "../../hooks/budgets/useSubmitBudget";
import { formatDateTime } from "../../utils/dateFormatters";

function getMethodBase(method) {
  if (method === "CUSTOM_MONTHLY" || method === "CUSTOM_QUARTERLY")
    return "CUSTOM";
  return method;
}

function getMethodNote(method) {
  if (method === "MONTHLY") return "Auto Distribute";
  if (method === "QUARTERLY") return "Auto Distribute";
  if (method === "CUSTOM_MONTHLY") return "Monthly";
  if (method === "CUSTOM_QUARTERLY") return "Quarter";
  return "";
}

function MethodBadge({ method }) {
  const base = getMethodBase(method);
  const note = getMethodNote(method);

  const styles = {
    MONTHLY: "bg-blue-50 text-blue-700 border-blue-100",
    QUARTERLY: "bg-emerald-50 text-emerald-700 border-emerald-100",
    CUSTOM: "bg-orange-50 text-orange-700 border-orange-100",
    ANNUAL: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <div className="text-center">
      <span
        className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${styles[base]}`}
      >
        {base}
      </span>
      {note && (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          ({note})
        </p>
      )}
    </div>
  );
}

export default function BudgetEnteryPage() {
  const {
    currentBudget,
    rows,
    setRows,
    categories,
    typesByCategory,
    openYear,
    loadingSetup,
    saving,
    updateRow,
    addItem,
    deleteItem,
    saveDraft,
  } = useCreateBudgetManual();
  const submitBudgetMutation = useSubmitBudget();
  const [summaryView, setSummaryView] = useState("QUARTER");
  const hasUnsavedChanges = useMemo(
    () => rows.some((row) => !row.isSaved),
    [rows],
  );
  const { setHasUnsavedChanges } = useUnsavedChanges();
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);

    return () => {
      setHasUnsavedChanges(false);
    };
  }, [hasUnsavedChanges, setHasUnsavedChanges]);
  const [deleteRowId, setDeleteRowId] = useState(null);
  const [deletingRowIds, setDeletingRowIds] = useState([]);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [localBudgetStatus, setLocalBudgetStatus] = useState(null);
  const [requestItemModalOpen, setRequestItemModalOpen] = useState(false);
  const saveDraftLockRef = useRef(false);
  const budgetStatus = localBudgetStatus || currentBudget?.status || "DRAFT";
  const isBudgetLocked = ["PENDING_APPROVAL", "APPROVED", "CANCELLED"].includes(
    budgetStatus,
  );
  const { data: reviewFeedback } = useBudgetReviewFeedback(
    currentBudget?.id,
    budgetStatus === "RETURNED",
  );

  const returnedItemNotes = reviewFeedback?.itemNotes || [];

  const returnedItemNotesByItemId = useMemo(() => {
    const map = new Map();

    returnedItemNotes.forEach((note) => {
      if (!note.budget_item_id) return;

      if (!map.has(Number(note.budget_item_id))) {
        map.set(Number(note.budget_item_id), []);
      }

      map.get(Number(note.budget_item_id)).push(note);
    });

    return map;
  }, [returnedItemNotes]);
  function getMonthlyAmountForSummary(row, monthIndex) {
    // notremoved
    const unitPrice = toNumber(row.unitPrice);

    if (row.method === "ANNUAL") {
      return monthIndex === 0 ? toNumber(row.quantity) * unitPrice : 0;
    }

    if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
      const monthly = getMonthlyDistribution(row);
      return toNumber(monthly[monthIndex]) * unitPrice;
    }

    if (row.method === "QUARTERLY" || row.method === "CUSTOM_QUARTERLY") {
      const quarterly = getQuarterlyDistribution(row);

      if (monthIndex === 0) return toNumber(quarterly[0]) * unitPrice;
      if (monthIndex === 3) return toNumber(quarterly[1]) * unitPrice;
      if (monthIndex === 6) return toNumber(quarterly[2]) * unitPrice;
      if (monthIndex === 9) return toNumber(quarterly[3]) * unitPrice;

      return 0;
    }

    return 0;
  }
  async function handleSubmitBudget() {
    if (isBudgetLocked) {
      toast.error("This budget cannot be submitted");
      return;
    }
    if (rows.length === 0) {
      toast.error("Please add at least one budget item before submitting");
      return;
    }
    try {
      if (!currentBudget?.id) {
        toast.error("No budget found");
        return;
      }

      if (validationError) {
        toast.error(validationError, { duration: 3500 });
        return;
      }

      if (hasUnsavedChanges) {
        const saveSuccess = await handleSaveDraft();

        if (!saveSuccess) return;
      }

      await submitBudgetMutation.mutateAsync(currentBudget.id);
      setLocalBudgetStatus("PENDING_APPROVAL");
      setHasUnsavedChanges(false);
      toast.success("Budget submitted for approval");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit budget");
    }
  }
  const summary = useMemo(() => {
    const totalQuantity = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity),
      0,
    );
    const totalAmount = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice),
      0,
    );

    const quarterTotals = [0, 1, 2, 3].map((quarterIndex) =>
      rows.reduce((sum, row) => sum + getQuarterAmount(row, quarterIndex), 0),
    );

    const monthTotals = months.map((_, monthIndex) =>
      rows.reduce(
        (sum, row) => sum + getMonthlyAmountForSummary(row, monthIndex),
        0,
      ),
    );

    const isValid = rows.every((row) => {
      const hasValidNumbers =
        toNumber(row.quantity) > 0 && toNumber(row.unitPrice) > 0;

      if (!row.category || !row.item || !hasValidNumbers) return false;

      if (row.method === "ANNUAL") return true;

      return getDistributedQuantity(row) === toNumber(row.quantity);
    });

    return { totalQuantity, totalAmount, quarterTotals, monthTotals, isValid };
  }, [rows]);

  function updateMonthly(id, index, value) {
    // notremoved
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const monthly = normalizeArray(row.monthly, 12);
        const totalQuantity = toNumber(row.quantity);

        const otherMonthsTotal = monthly.reduce((sum, qty, i) => {
          if (i === index) return sum;
          return sum + toNumber(qty);
        }, 0);

        const maxAllowed = Math.max(0, totalQuantity - otherMonthsTotal);
        monthly[index] = Math.min(toNumber(value), maxAllowed);

        return { ...row, monthly };
      }),
    );
  }

  function updateQuarterly(id, index, value) {
    // notremoved
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const quarterly = normalizeArray(row.quarterly, 4);
        const totalQuantity = toNumber(row.quantity);

        const otherQuartersTotal = quarterly.reduce((sum, qty, i) => {
          if (i === index) return sum;
          return sum + toNumber(qty);
        }, 0);

        const maxAllowed = Math.max(0, totalQuantity - otherQuartersTotal);
        quarterly[index] = Math.min(toNumber(value), maxAllowed);

        return { ...row, quarterly };
      }),
    );
  }

  async function handleSaveDraft() {
    if (saveDraftLockRef.current) {
      return false;
    }

    saveDraftLockRef.current = true;

    try {
      if (isBudgetLocked) {
        toast.error("This budget is read-only");
        return false;
      }

      if (rows.length === 0) {
        toast.error("Please add at least one budget item before saving");
        return false;
      }

      if (validationError) {
        toast.error(validationError, { duration: 3500 });
        return false;
      }

      await saveDraft(
        rows.map((row) => ({
          id: row.isNew ? null : Number(row.id),
          type_id: Number(row.item),
          quantity: toNumber(row.quantity),
          unit_price: toNumber(row.unitPrice),
          distribution_method: getApiDistributionMethod(row.method),
          distribution_level: getApiDistributionLevel(row.method),
          distribution: getApiDistributionRows(row),
        })),
      );

      return true;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save budget");
      return false;
    } finally {
      saveDraftLockRef.current = false;
    }
  }
  async function handleDeleteRowWithAnimation() {
    if (!deleteRowId) return;

    const rowId = deleteRowId;

    setDeletingRowIds((prev) => [...prev, rowId]);
    setDeleteRowId(null);

    setTimeout(async () => {
      await deleteItem(rowId);

      setDeletingRowIds((prev) => prev.filter((id) => id !== rowId));
    }, 180);
  }
  function getSelectedType(row) {
    // notremoved
    const types = typesByCategory[row.category];

    if (!Array.isArray(types)) return null;

    return types.find((type) => Number(type.id) === Number(row.item));
  }

  const validationError = useMemo(() => validateRowsDetailed(rows), [rows]);
  const duplicateTypeRowIds = useMemo(
    () => getDuplicateTypeRowIds(rows),
    [rows],
  );
  return (
    <div className="space-y-5 p-6 text-slate-800">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Breadcrumbs />

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Enter Budget Items - Manual Entry
          </h1>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRequestItemModalOpen(true)}
            disabled={isBudgetLocked || loadingSetup}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PackagePlus size={17} />
            Request Item
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={
              isBudgetLocked || !!validationError || saving || loadingSetup
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            disabled={
              isBudgetLocked ||
              !!validationError ||
              saving ||
              loadingSetup ||
              submitBudgetMutation.isPending
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:scale-[1.02]"
          >
            <Send size={17} />
            {submitBudgetMutation.isPending
              ? "Submitting..."
              : "Submit for Approval"}
          </button>
        </div>
      </div>
      {!loadingSetup && rows.length > 0 && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 mt-2
      ${
        hasUnsavedChanges
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    `}
        >
          {hasUnsavedChanges ? (
            <>
              <AlertCircle size={16} />
              You have unsaved changes
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              All changes are saved
            </>
          )}
        </div>
      )}
      {isBudgetLocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          This budget is {budgetStatus}. It is read-only and cannot be edited.
        </div>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-blue-600">Budget Information</h2>

        <div className="mt-4 grid gap-5 border-t border-slate-200 pt-4 md:grid-cols-5">
          <Info
            label="Department:"
            value={currentBudget?.department_name || "Loading..."}
          />
          <Info
            label="Budget Year:"
            value={
              currentBudget?.financial_year || openYear?.year || "No OPEN year"
            }
          />{" "}
          <Info
            label="Status:"
            value={
              <span
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  getBudgetStatusStyle(budgetStatus).badge
                }`}
              >
                {getBudgetStatusLabel(budgetStatus)}
              </span>
            }
          />
          <Info
            label="Created By:"
            value={currentBudget?.created_by_name || "Not available"}
          />
          <Info
            label="Created Date:"
            value={
              currentBudget?.created_at
                ? formatDateTime(currentBudget.created_at)
                : "Not available"
            }
          />{" "}
        </div>
      </section>
      {budgetStatus === "RETURNED" && currentBudget?.id && (
        <BudgetReviewFeedback
          budgetId={currentBudget.id}
          onItemNoteClick={scrollToBudgetItemRow}
        />
      )}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Budget Items</h2>

            {budgetStatus === "RETURNED" && returnedItemNotes.length > 0 && (
              <p className="mt-1 text-sm font-semibold text-amber-700">
                {returnedItemNotes.length} item note(s) from approver need
                review.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={addItem}
              disabled={isBudgetLocked}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              Add Item
            </button>

            <button
              disabled={isBudgetLocked}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={17} />
              Import from Excel
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1800px] table-fixed border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="text-slate-700">
                <th rowSpan="2" className="border border-slate-200 px-3 py-4">
                  #
                </th>
                <th
                  rowSpan="2"
                  className="w-[220px] border border-slate-200 px-4 py-4"
                >
                  Category
                </th>
                <th
                  rowSpan="2"
                  className="w-[260px] border border-slate-200 px-4 py-4"
                >
                  Item / Type
                </th>
                <th
                  rowSpan="2"
                  className="w-[180px] border border-slate-200 px-4 py-4"
                >
                  Method
                </th>
                <th
                  rowSpan="2"
                  className="w-[120px] border border-slate-200 px-4 py-4"
                >
                  Total Quantity
                </th>
                <th
                  rowSpan="2"
                  className="w-[120px] border border-slate-200 px-4 py-4"
                >
                  Unit Price
                </th>
                <th
                  rowSpan="2"
                  className="w-[150px] border border-slate-200 px-4 py-4"
                >
                  Total Amount
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-blue-50 px-4 py-3"
                >
                  QUARTER 1<br />
                  <span className="text-xs font-medium">Jan - Mar</span>
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-emerald-50 px-4 py-3"
                >
                  QUARTER 2<br />
                  <span className="text-xs font-medium">Apr - Jun</span>
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-orange-50 px-4 py-3"
                >
                  QUARTER 3<br />
                  <span className="text-xs font-medium">Jul - Sep</span>
                </th>
                <th
                  colSpan="3"
                  className="border border-slate-200 bg-violet-50 px-4 py-3"
                >
                  QUARTER 4<br />
                  <span className="text-xs font-medium">Oct - Dec</span>
                </th>
                <th rowSpan="2" className="border border-slate-200 px-4 py-4">
                  Actions
                </th>
              </tr>

              <tr>
                {months.map((month) => (
                  <th
                    key={month}
                    className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => {
                const totalAmount =
                  toNumber(row.quantity) * toNumber(row.unitPrice);
                const monthly = getMonthlyDistribution(row);
                const quarterly = getQuarterlyDistribution(row);
                const distributedQuantity = getDistributedQuantity(row);
                const isRowValid =
                  toNumber(row.quantity) > 0 &&
                  toNumber(row.unitPrice) > 0 &&
                  (row.method === "ANNUAL" ||
                    distributedQuantity === toNumber(row.quantity));
                const selectedType = getSelectedType(row);
                const isDuplicateTypeRow = duplicateTypeRowIds.has(row.id);
                const rowReturnNotes =
                  returnedItemNotesByItemId.get(Number(row.id)) || [];
                const hasReturnNotes = rowReturnNotes.length > 0;

                return (
                  <tr
                    id={`budget-item-row-${row.id}`}
                    key={row.id}
                    className={[
                      "budget-row-enter transition-all duration-200 ease-in-out",
                      deletingRowIds.includes(row.id)
                        ? "opacity-0 scale-[0.995]"
                        : "opacity-100 scale-100",
                      hasReturnNotes
                        ? "bg-amber-50 border-l-4 border-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]"
                        : !isRowValid || isDuplicateTypeRow
                          ? "bg-red-50 border-l-4 border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]"
                          : "",
                    ].join(" ")}
                  >
                    <td className="truncate border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600">
                      <div className="flex flex-col items-center gap-1">
                        <span>{rowIndex + 1}</span>

                        {!row.isSaved && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Unsaved
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="w-[220px] border border-slate-200 px-3 py-4">
                      <div className="w-full min-w-[200px]">
                        <SearchableMultiSelect
                          disabled={isBudgetLocked}
                          name="category"
                          multiple={false}
                          disableClear
                          value={row.category}
                          options={categories}
                          placeholder="Category"
                          searchPlaceholder="Search category..."
                          maxVisibleBadges={1}
                          getOptionValue={(option) => option.id}
                          getOptionLabel={(option) => option.name}
                          onChange={(e) =>
                            updateRow(row.id, "category", e.target.value)
                          }
                        />
                      </div>
                    </td>

                    <td className="w-[260px] border border-slate-200 px-3 py-4">
                      <div className="w-full min-w-[200px]">
                        <SearchableMultiSelect
                          disabled={isBudgetLocked}
                          name="item"
                          multiple={false}
                          disableClear
                          value={row.item}
                          options={typesByCategory[row.category] || []}
                          placeholder="Item / Type"
                          searchPlaceholder="Search item..."
                          maxVisibleBadges={1}
                          getOptionValue={(option) => option.id}
                          getOptionLabel={(option) => option.name}
                          onChange={(e) =>
                            updateRow(row.id, "item", e.target.value)
                          }
                        />
                      </div>
                      {isDuplicateTypeRow && (
                        <div className="mt-1 flex justify-center">
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                            <AlertCircle size={12} />
                            Duplicate item
                          </span>
                        </div>
                      )}
                      {selectedType?.expense_type && (
                        <div className="mt-2 flex justify-center">
                          {" "}
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${
                              selectedType.expense_type === "CAPEX"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {selectedType.expense_type}
                          </span>
                        </div>
                      )}
                      {hasReturnNotes && (
                        <div className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          {rowReturnNotes.map((note) => (
                            <div key={note.id}>
                              <span className="font-bold">Approver note:</span>{" "}
                              {note.note}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="w-[180px] border border-slate-200 px-3 py-4 align-middle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-full min-w-[200px]">
                          <SearchableMultiSelect
                            disabled={isBudgetLocked}
                            name="method"
                            multiple={false}
                            disableClear
                            value={row.method}
                            options={methodOptions}
                            placeholder="Method"
                            searchPlaceholder="Search method..."
                            maxVisibleBadges={1}
                            getOptionValue={(option) => option.value}
                            getOptionLabel={(option) => option.label}
                            onChange={(e) =>
                              updateRow(row.id, "method", e.target.value)
                            }
                          />
                        </div>

                        <MethodBadge method={row.method} />
                      </div>
                    </td>
                    <td className="border border-slate-200 px-3 py-4 text-center">
                      <input
                        type="number"
                        disabled={isBudgetLocked}
                        min="0"
                        value={row.quantity === 0 ? "" : row.quantity}
                        onChange={(e) =>
                          updateRow(
                            row.id,
                            "quantity",
                            toNumber(e.target.value),
                          )
                        }
                        onBlur={(e) =>
                          updateRow(
                            row.id,
                            "quantity",
                            toNumber(e.target.value),
                          )
                        }
                        className={`h-9 w-20 rounded-md border text-center text-xs font-semibold transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
  ${
    row.quantity <= 0
      ? "border-red-400 bg-red-50 text-red-600"
      : "border-slate-200 bg-white text-slate-700"
  }
`}
                      />
                    </td>

                    <td className="border border-slate-200 px-3 py-4 text-center">
                      <input
                        type="number"
                        disabled={isBudgetLocked}
                        min="0"
                        value={row.unitPrice === 0 ? "" : row.unitPrice}
                        onChange={(e) =>
                          updateRow(
                            row.id,
                            "unitPrice",
                            toNumber(e.target.value),
                          )
                        }
                        onBlur={(e) =>
                          updateRow(
                            row.id,
                            "unitPrice",
                            toNumber(e.target.value),
                          )
                        }
                        className={`h-9 w-20 rounded-md border text-center text-xs font-semibold transition-all duration-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
  ${
    row.unitPrice <= 0
      ? "border-red-400 bg-red-50 text-red-600"
      : "border-slate-200 bg-white text-slate-700"
  }
`}
                      />
                    </td>

                    <td className="truncate border border-slate-200 px-3 py-4 text-center font-bold text-blue-600">
                      <CurrencyText value={totalAmount} />
                    </td>

                    {(row.method === "MONTHLY" ||
                      row.method === "CUSTOM_MONTHLY") &&
                      monthly.map((qty, index) => (
                        <td
                          key={index}
                          className="border border-slate-200 px-2 py-2 text-center"
                        >
                          <input
                            type="number"
                            min="0"
                            value={qty === 0 ? "" : qty}
                            disabled={
                              isBudgetLocked || row.method === "MONTHLY"
                            }
                            onChange={(e) =>
                              updateMonthly(row.id, index, e.target.value)
                            }
                            className="mx-auto h-8 w-16 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            <CurrencyText
                              value={qty * toNumber(row.unitPrice)}
                            />
                          </p>
                        </td>
                      ))}

                    {(row.method === "QUARTERLY" ||
                      row.method === "CUSTOM_QUARTERLY") &&
                      quarterly.map((qty, index) => (
                        <td
                          key={index}
                          colSpan="3"
                          className="border border-slate-200 px-2 py-2 text-center"
                        >
                          <input
                            type="number"
                            min="0"
                            value={qty === 0 ? "" : qty}
                            disabled={
                              isBudgetLocked || row.method === "QUARTERLY"
                            }
                            onChange={(e) =>
                              updateQuarterly(row.id, index, e.target.value)
                            }
                            className="mx-auto h-8 w-28 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            <CurrencyText
                              value={qty * toNumber(row.unitPrice)}
                            />
                          </p>
                        </td>
                      ))}

                    {row.method === "ANNUAL" && (
                      <td
                        colSpan="12"
                        className="border border-slate-200 px-3 py-4 text-center"
                      >
                        <div className="flex flex-col items-center gap-1">
                          {/* Main info */}
                          <span className="text-sm font-semibold text-slate-800">
                            {row.quantity} units / year
                          </span>

                          {/* Total */}
                          <span className="text-sm font-bold text-blue-600">
                            Total:{" "}
                            <CurrencyText
                              value={row.quantity * toNumber(row.unitPrice)}
                            />
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="border border-slate-200 px-3 py-4 text-center">
                      <button
                        type="button"
                        disabled={isBudgetLocked}
                        onClick={() => setDeleteRowId(row.id)}
                        className="rounded-lg bg-red-50 p-2 text-red-500 transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan="20"
                    className="border border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    No budget items yet. Click Add Item to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            {validationError ? (
              <AlertCircle className="text-red-500" size={34} />
            ) : (
              <CheckCircle2 className="text-emerald-600" size={34} />
            )}

            <div>
              <h3 className="font-bold text-slate-900">Validation</h3>
              <p
                className={`mt-1 text-sm font-semibold ${
                  validationError ? "text-red-500" : "text-emerald-600"
                }`}
              >
                {validationError || "All items are valid and ready to save."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Budget Summary
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Switch between quarterly and monthly allocation view.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSummaryView("QUARTER")}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  summaryView === "QUARTER"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Per Quarter
              </button>

              <button
                type="button"
                onClick={() => setSummaryView("MONTH")}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  summaryView === "MONTH"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Per Month
              </button>
            </div>
          </div>
          <div className="transition-all duration-200 ease-in-out">
            {summaryView === "QUARTER" ? (
              <div className="grid animate-[fadeIn_0.18s_ease-in-out] md:grid-cols-6">
                <Summary
                  label="Total Quantity"
                  value={formatNumber(summary.totalQuantity)}
                />
                <Summary
                  label="Total Amount"
                  value={<CurrencyText value={summary.totalAmount} />}
                  blue
                />
                <Summary
                  label="Q1"
                  value={<CurrencyText value={summary.quarterTotals[0]} />}
                />
                <Summary
                  label="Q2"
                  value={<CurrencyText value={summary.quarterTotals[1]} />}
                />
                <Summary
                  label="Q3"
                  value={<CurrencyText value={summary.quarterTotals[2]} />}
                />
                <Summary
                  label="Q4"
                  value={<CurrencyText value={summary.quarterTotals[3]} />}
                />
              </div>
            ) : (
              <div className="animate-[fadeIn_0.18s_ease-in-out] p-4">
                <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Monthly Allocation
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Quarterly and annual amounts are placed in the first month
                      of their period.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500">
                      Total Amount
                    </p>
                    <p className="text-xl font-bold text-blue-600">
                      <CurrencyText value={summary.totalAmount} />
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {months.map((month, index) => {
                    const amount = summary.monthTotals[index];
                    const hasAmount = amount > 0;

                    return (
                      <div
                        key={month}
                        className={`rounded-xl border p-4 transition-all duration-200 ease-in-out ${
                          hasAmount
                            ? "border-blue-100 bg-white shadow-sm"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {month}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              {hasAmount ? "Allocated amount" : "No allocation"}
                            </p>
                          </div>

                          <p
                            className={`text-base font-bold ${
                              hasAmount ? "text-blue-600" : "text-slate-400"
                            }`}
                          >
                            <CurrencyText value={amount} />
                          </p>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-in-out"
                            style={{
                              width: `${summary.totalAmount > 0 ? Math.min((amount / summary.totalAmount) * 100, 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm md:grid-cols-5">
        <Legend
          title="MONTHLY"
          desc="System automatically distributes quantity equally by month."
          color="text-blue-600 bg-blue-50"
        />
        <Legend
          title="QUARTERLY"
          desc="System automatically distributes quantity equally by quarter."
          color="text-emerald-600 bg-emerald-50"
        />
        <Legend
          title="CUSTOM (MONTHLY)"
          desc="You enter quantity manually for each month."
          color="text-orange-600 bg-orange-50"
        />
        <Legend
          title="CUSTOM (QUARTER)"
          desc="You enter quantity manually for each quarter."
          color="text-orange-600 bg-orange-50"
        />
        <Legend
          title="ANNUAL"
          desc="No monthly distribution. One annual total only."
          color="text-violet-600 bg-violet-50"
        />
      </section>
      <ConfirmModal
        open={deleteRowId !== null}
        danger
        title="Delete budget item?"
        message="This item will be removed from the table. If it already exists in the database, it will also be deleted permanently."
        confirmText="Delete"
        loading={saving}
        onCancel={() => setDeleteRowId(null)}
        onConfirm={handleDeleteRowWithAnimation}
      />
      <ConfirmModal
        open={confirmSubmitOpen}
        title="Submit budget for approval?"
        message="Are you sure you want to submit this budget? After submission, the budget will become PENDING_APPROVAL and cannot be edited unless the approver returns it."
        confirmText="Submit Budget"
        loading={submitBudgetMutation.isPending}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={async () => {
          setConfirmSubmitOpen(false);
          await handleSubmitBudget();
        }}
      />
      <RequestBudgetItemModal
        open={requestItemModalOpen}
        onClose={() => setRequestItemModalOpen(false)}
        categories={categories}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <div className="mt-2 text-sm font-medium text-slate-600 truncate">
        {value}
      </div>
    </div>
  );
}

function Summary({ label, value, blue }) {
  return (
    <div className="border-r border-slate-200 p-5 text-center last:border-r-0">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p
        className={`mt-3 text-2xl font-bold ${blue ? "text-blue-600" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Legend({ title, desc, color }) {
  return (
    <div>
      <span className={`rounded px-2 py-1 font-bold ${color}`}>{title}</span>
      <p className="mt-2 font-medium text-slate-500">{desc}</p>
    </div>
  );
}
