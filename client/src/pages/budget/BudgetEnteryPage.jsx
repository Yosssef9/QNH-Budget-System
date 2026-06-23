import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import LockedPage from "../../components/LockedPage";
import useLockToast from "../../hooks/useLockToast";
import { getBudgetEntryPageLock } from "../../helpers/pageLockRules";
import {
  ChevronDown,
  Download,
  Plus,
  Upload,
  Copy,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
} from "lucide-react";
import { getAllBudgetTypes } from "../../api/budget.api";
import useEscapeKey from "../../hooks/useEscapeKey";
import {
  downloadBudgetTemplate,
  importBudgetTemplate,
} from "../../helpers/budgetExcel.helper";
import useClickOutside from "../../hooks/useClickOutside";
import BudgetSummaryPanel from "../../components/budgets/shared/BudgetSummaryPanel";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import ConfirmModal from "../../components/ConfirmModal";
import Breadcrumbs from "../../components/Breadcrumbs";

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
import { useNavigate } from "react-router-dom";
import {
  getDuplicateTypeRowIds,
  validateRowsDetailed,
} from "../../helpers/budgetValidation.helper";
import { useSubmitBudget } from "../../hooks/budgets/useSubmitBudget";
import useBudgetSummary from "../../hooks/budgets/useBudgetSummary";
import BudgetHeaderCard from "../../components/budgets/shared/BudgetHeaderCard";

import BudgetDistributionTable from "../../components/budgets/shared/BudgetDistributionTable";
import { BUDGET_ITEMS_PAGE_SIZE } from "../../constants/budget.constants";
import { lazy, Suspense } from "react";

const CopyBudgetDrawer = lazy(
  () => import("../../components/budgets/CopyBudgetDrawer"),
);

const RequestBudgetItemModal = lazy(
  () => import("../../components/budgets/RequestBudgetItemModal"),
);

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
  const pageLock = getBudgetEntryPageLock(openYear);

  useLockToast(pageLock.locked && !loadingSetup, pageLock.message);
  const lockedContent = (
    <div className="space-y-6">
      <Breadcrumbs />

      <LockedPage
        title={pageLock.title}
        message={pageLock.message}
        reasons={pageLock.reasons}
      />
    </div>
  );
  const submitBudgetMutation = useSubmitBudget();
  const [summaryView, setSummaryView] = useState("QUARTER");
  const [budgetItemsPage, setBudgetItemsPage] = useState(1);
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
  const [copyDrawerOpen, setCopyDrawerOpen] = useState(false);
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const importInputRef = useRef(null);
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
  const excelMenuRef = useRef(null);

  const closeExcelMenu = useCallback(() => {
    setExcelMenuOpen(false);
  }, []);
  useEscapeKey(closeExcelMenu, excelMenuOpen);
  useClickOutside(excelMenuRef, closeExcelMenu, excelMenuOpen);
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
  const summary = useBudgetSummary(rows, getMonthlyAmountForSummary);
  const updateMonthly = useCallback((id, index, value) => {
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
  }, []);

  const updateQuarterly = useCallback((id, index, value) => {
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
  }, []);
  async function handleDownloadTemplate() {
    try {
      const types = await getAllBudgetTypes();

      downloadBudgetTemplate(types);
    } catch (error) {
      console.error(error);

      toast.error("Failed to download template");
    }
  }
  async function handleImportExcel(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const allTypes = await getAllBudgetTypes();

      const result = await importBudgetTemplate({
        file,
        rows,
        allTypes,
      });

      if (result.importedRows.length > 0) {
        setRows((prev) => [...prev, ...result.importedRows]);
      }

      setBudgetItemsPage(1);

      setImportErrors(result.errors);
      if (result.successCount === 0) {
        toast.error("No valid budget items found in the selected file");
      }
      setImportSummary({
        successCount: result.successCount,
        errorCount: result.errorCount,
      });

      setImportSummaryOpen(true);

      toast.success(
        `Imported ${result.successCount} budget item(s) successfully`,
      );
    } catch (error) {
      console.error(error);

      toast.error("Failed to import Excel file");
    }

    event.target.value = "";
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
          is_project: row.isProject === true,
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
      try {
        await deleteItem(rowId);

        toast.success("Budget item deleted successfully");

        setDeletingRowIds((prev) => prev.filter((id) => id !== rowId));
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to delete budget item",
        );

        setDeletingRowIds((prev) => prev.filter((id) => id !== rowId));
      }
    }, 180);
  }
  const getSelectedType = useCallback(
    (row) => {
      const types = typesByCategory[row.category];

      if (!Array.isArray(types)) return null;

      return types.find((type) => type.id === row.item);
    },
    [typesByCategory],
  );

  const validationError = useMemo(() => validateRowsDetailed(rows), [rows]);
  const duplicateTypeRowIds = useMemo(
    () => getDuplicateTypeRowIds(rows),
    [rows],
  );
  const totalBudgetItemsPages = useMemo(() => {
    return Math.max(1, Math.ceil(rows.length / BUDGET_ITEMS_PAGE_SIZE));
  }, [rows.length]);

  useEffect(() => {
    if (budgetItemsPage > totalBudgetItemsPages) {
      setBudgetItemsPage(totalBudgetItemsPages);
    }
  }, [budgetItemsPage, totalBudgetItemsPages]);

  const paginatedRows = useMemo(() => {
    const start = (budgetItemsPage - 1) * BUDGET_ITEMS_PAGE_SIZE;
    return rows.slice(start, start + BUDGET_ITEMS_PAGE_SIZE);
  }, [rows, budgetItemsPage]);
  const handleCopyBudget = (copiedRows) => {
    setRows((currentRows) => [...currentRows, ...copiedRows]);

    setBudgetItemsPage(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    toast.success(`${copiedRows.length} items added successfully`);
  };
  
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
      <BudgetHeaderCard
        currentBudget={currentBudget}
        openYear={openYear}
        budgetStatus={budgetStatus}
      />
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
          <div className="flex flex-wrap items-center gap-3">
            <div ref={excelMenuRef} className="relative">
              <button
                type="button"
                disabled={isBudgetLocked}
                onClick={() => setExcelMenuOpen((prev) => !prev)}
                className="
    group
    inline-flex
    items-center
    gap-3
    rounded-xl
    border-2
    border-emerald-200
    bg-white
    px-5
    py-3
    text-sm
    font-bold
    text-slate-800
    shadow-sm
    transition-all
    duration-200
    hover:-translate-y-0.5
    hover:border-emerald-400
    hover:bg-emerald-50
    hover:shadow-lg
  "
              >
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                  <Upload size={18} />
                </div>

                <div className="flex flex-col items-start leading-none">
                  <span>Import & Templates</span>

                  <span className="mt-1 text-[11px] font-medium text-slate-500">
                    Excel Budget Tools
                  </span>
                </div>

                <ChevronDown
                  size={16}
                  className={`ml-1 transition-transform duration-300 ease-out ${
                    excelMenuOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              <div
                className={`
    absolute
    left-0
    top-full
    z-50
    mt-3
    w-80
    overflow-hidden
    rounded-3xl
    border
    border-slate-200
    bg-white
    shadow-[0_20px_60px_rgba(15,23,42,0.18)]
    backdrop-blur-xl

    origin-top-left
    transition-[opacity,transform]
    duration-300
    ease-out
    will-change-transform

    ${
      excelMenuOpen
        ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
        : "-translate-y-3 scale-95 opacity-0 pointer-events-none"
    }
  `}
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-bold text-slate-900">Excel Tools</h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Import budgets or download the latest template
                  </p>
                </div>

                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setExcelMenuOpen(false);
                      handleDownloadTemplate();
                    }}
                    className="
    group
    flex
    w-full
    items-start
    gap-4
    rounded-2xl
    border
    border-transparent
    p-4
    text-left

    transition-all
    duration-200

    hover:-translate-y-0.5
    hover:border-blue-200
    hover:bg-blue-50
    hover:shadow-md

    active:scale-[0.98]
  "
                  >
                    <div
                      className="
      rounded-xl
      bg-blue-100
      p-3
      text-blue-600

      transition-all
      duration-200

      group-hover:bg-blue-200
      group-hover:scale-110
    "
                    >
                      <Download size={18} />
                    </div>

                    <div>
                      <div
                        className="
        font-semibold
        text-slate-900
        transition-colors
        group-hover:text-blue-700
      "
                      >
                        Download Template
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Get the latest approved Excel format
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExcelMenuOpen(false);
                      importInputRef.current?.click();
                    }}
                    className="
    group
    mt-2
    flex
    w-full
    items-start
    gap-4
    rounded-2xl
    border
    border-transparent
    p-4
    text-left

    transition-all
    duration-200

    hover:-translate-y-0.5
    hover:border-emerald-200
    hover:bg-emerald-50
    hover:shadow-md

    active:scale-[0.98]
  "
                  >
                    <div
                      className="
      rounded-xl
      bg-emerald-100
      p-3
      text-emerald-600

      transition-all
      duration-200

      group-hover:bg-emerald-200
      group-hover:scale-110
    "
                    >
                      <Upload size={18} />
                    </div>

                    <div>
                      <div
                        className="
        font-semibold
        text-slate-900
        transition-colors
        group-hover:text-emerald-700
      "
                      >
                        Import Budget File
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Import multiple budget items from Excel
                      </div>
                    </div>
                  </button>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <p className="text-xs font-medium text-slate-500">
                    Supported formats: .xlsx, .xls
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              hidden
            />
            <button
              type="button"
              onClick={() => setCopyDrawerOpen(true)}
              disabled={isBudgetLocked}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={17} />
              Copy From History
            </button>
            <div className="mx-2 hidden h-8 w-px bg-slate-200 md:block" />

            <button
              type="button"
              onClick={addItem}
              disabled={isBudgetLocked}
              className="
    group
    inline-flex
    items-center
    gap-3
    rounded-xl
    border-2
    border-blue-200
    bg-white
    px-5
    py-3
    text-sm
    font-bold
    text-slate-800
    shadow-sm
    transition-all
    duration-200
    hover:-translate-y-0.5
    hover:border-blue-400
    hover:bg-blue-50
    hover:shadow-lg
    active:scale-[0.98]
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
            >
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600 transition-all group-hover:bg-blue-200">
                <Plus size={18} />
              </div>

              <div className="flex flex-col items-start leading-none">
                <span className="text-slate-900">Add New Item</span>

                <span className="mt-1 text-[11px] font-medium text-slate-500">
                  Manual Entry
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <BudgetDistributionTable
            paginatedRows={paginatedRows}
            rows={rows}
            budgetItemsPage={budgetItemsPage}
            categories={categories}
            typesByCategory={typesByCategory}
            methodOptions={methodOptions}
            duplicateTypeRowIds={duplicateTypeRowIds}
            deletingRowIds={deletingRowIds}
            returnedItemNotesByItemId={returnedItemNotesByItemId}
            isBudgetLocked={isBudgetLocked}
            getMonthlyDistribution={getMonthlyDistribution}
            getQuarterlyDistribution={getQuarterlyDistribution}
            getDistributedQuantity={getDistributedQuantity}
            getSelectedType={getSelectedType}
            updateRow={updateRow}
            updateMonthly={updateMonthly}
            updateQuarterly={updateQuarterly}
            setDeleteRowId={setDeleteRowId}
          />
        </div>

        {importErrors.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-red-700">Import Errors</h3>

              <button
                type="button"
                onClick={() => setImportErrors([])}
                className="text-sm font-semibold text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            </div>

            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-200">
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-left">Error</th>
                  </tr>
                </thead>

                <tbody>
                  {importErrors.map((error, index) => (
                    <tr key={index} className="border-b border-red-100">
                      <td className="p-2 font-bold">{error.row}</td>
                      <td className="p-2">{error.item}</td>
                      <td className="p-2 text-red-600">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {rows.length > BUDGET_ITEMS_PAGE_SIZE && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Showing{" "}
              <span className="text-slate-900">
                {(budgetItemsPage - 1) * BUDGET_ITEMS_PAGE_SIZE + 1}
              </span>
              {" - "}
              <span className="text-slate-900">
                {Math.min(
                  budgetItemsPage * BUDGET_ITEMS_PAGE_SIZE,
                  rows.length,
                )}
              </span>
              {" of "}
              <span className="text-slate-900">{rows.length}</span>
              {" items"}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setBudgetItemsPage((page) => Math.max(1, page - 1))
                }
                disabled={budgetItemsPage <= 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                Page {budgetItemsPage} / {totalBudgetItemsPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setBudgetItemsPage((page) =>
                    Math.min(totalBudgetItemsPages, page + 1),
                  )
                }
                disabled={budgetItemsPage >= totalBudgetItemsPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
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

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setSummaryView("QUARTER")}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all duration-300 ${
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
                className={`rounded-lg px-3 py-2 text-xs font-bold  transition-all duration-300 ${
                  summaryView === "MONTH"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Per Month
              </button>
            </div>
          </div>

          <BudgetSummaryPanel summary={summary} summaryView={summaryView} />
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
      <ConfirmModal
        open={importSummaryOpen}
        title="Excel Import Results"
        confirmText="Close"
        cancelText=""
        onCancel={() => setImportSummaryOpen(false)}
        onConfirm={() => setImportSummaryOpen(false)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={28} className="text-emerald-600" />

                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-700">
                    Imported
                  </p>

                  <p className="text-3xl font-bold text-emerald-700">
                    {importSummary?.successCount ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={28} className="text-red-600" />

                <div>
                  <p className="text-xs font-semibold uppercase text-red-700">
                    Errors
                  </p>

                  <p className="text-3xl font-bold text-red-700">
                    {importSummary?.errorCount ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {importSummary?.successCount > 0 &&
            importSummary?.errorCount === 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                All rows were imported successfully.
              </div>
            )}

          {importSummary?.errorCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700">
              Some rows could not be imported. Please review the Import Errors
              table below.
            </div>
          )}
        </div>
      </ConfirmModal>
      {requestItemModalOpen && (
        <Suspense fallback={null}>
          <RequestBudgetItemModal
            open={requestItemModalOpen}
            onClose={() => setRequestItemModalOpen(false)}
            categories={categories}
          />
        </Suspense>
      )}
      {copyDrawerOpen && (
        <Suspense fallback={null}>
          <CopyBudgetDrawer
            open={copyDrawerOpen}
            onClose={() => setCopyDrawerOpen(false)}
            onCopy={handleCopyBudget}
            hasExistingItems={rows.length > 0}
          />
        </Suspense>
      )}
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
