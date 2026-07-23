import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
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
import ConfirmModal from "../../components/ConfirmModal";
import Breadcrumbs from "../../components/Breadcrumbs";

import { useCreateBudgetManual } from "../../hooks/budgets/useCreateBudgetManual";
import { BUDGET_METHOD_OPTIONS as methodOptions } from "../../constants/budgetMethodOptions.constants";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { toNumber } from "../../utils/number";
import {
  getMonthlyDistribution,
  getQuarterlyDistribution,
  getDistributedQuantity,
  normalizeArray,
} from "../../helpers/budgetCalculations.helper";
import {
  getApiDistributionMethod,
  getApiDistributionRows,
} from "../../helpers/budgetPayload.helper";
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

import RequestBudgetItemModal from "../../components/budgets/RequestBudgetItemModal";
import {
  CategorySubmissionWindowBadge,
  CategorySubmissionWindowBanner,
  getCategorySubmissionWindowState,
} from "../../components/budgets/CategorySubmissionWindowStatus";

export default function BudgetEnteryPage() {
  const {
    currentBudget,
    rows,
    setRows,
    rowsByCategoryBudget,
    categories,
    categoryBudgets,
    activeCategoryBudget,
    activeCategoryBudgetId,
    setActiveCategoryBudgetId,
    typesByCategory,
    openYear,
    loadingSetup,
    saving,
    removedPersistedItemIdsByCategoryBudget,
    importRowsToCategoryBudgets,
    updateRow,
    addItem,
    deleteItem,
    saveDraft,
    refreshBudget,
  } = useCreateBudgetManual();
  // const pageLock = getBudgetEntryPageLock(openYear);

  // useLockToast(pageLock.locked && !loadingSetup, pageLock.message);
  // const lockedContent = (
  //   <div className="space-y-6">
  //     <Breadcrumbs />

  //     <LockedPage
  //       title={pageLock.title}
  //       message={pageLock.message}
  //       reasons={pageLock.reasons}
  //     />
  //   </div>
  // );
  const submitBudgetMutation = useSubmitBudget();
  const [summaryView, setSummaryView] = useState("QUARTER");
  const [budgetItemsPage, setBudgetItemsPage] = useState(1);
  const { setHasUnsavedChanges } = useUnsavedChanges();
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
  const [savingAllDrafts, setSavingAllDrafts] = useState(false);
  const [switchingCategoryId, setSwitchingCategoryId] = useState(null);
  const budgetStatus =
    localBudgetStatus || activeCategoryBudget?.status || "DRAFT";
  const activeCategoryName = activeCategoryBudget?.category_name || "selected";
  const activeCategoryBudgetLabel = `${activeCategoryName} Category Budget`;
  const isBudgetLocked = [
    "IN_CATEGORY_REVIEW",
    "CATEGORY_REVIEW_COMPLETED",
  ].includes(budgetStatus);
  const financialYearStatus =
    currentBudget?.financial_year_status ||
    openYear?.status ||
    "UNKNOWN";

  const activeSubmissionWindowState =
    getCategorySubmissionWindowState(
      activeCategoryBudget,
      financialYearStatus,
    );

  const canSubmitActiveCategory =
    activeSubmissionWindowState.canSubmit;

  const isCategoryReadOnly = useCallback(
    (categoryBudget) =>
      ["IN_CATEGORY_REVIEW", "CATEGORY_REVIEW_COMPLETED"].includes(
        categoryBudget?.status || "DRAFT",
      ),
    [],
  );

  const buildCategoryPayloadRows = useCallback((categoryBudget, sourceRows) => {
    return sourceRows.map((row) => ({
      id: row.isNew ? null : Number(row.id),
      category_id: Number(categoryBudget?.category_id),
      catalog_item_id: Number(row.item),
      requested_quantity: toNumber(row.quantity),
      distribution_method: getApiDistributionMethod(row.method),
      distribution: getApiDistributionRows(row),
    }));
  }, []);

  const categoryStateById = useMemo(() => {
    return Object.fromEntries(
      categoryBudgets.map((categoryBudget) => {
        const key = String(categoryBudget.id);
        const categoryRows = rowsByCategoryBudget[key] || [];
        const removedIds =
          removedPersistedItemIdsByCategoryBudget[key] || [];
        const validation = validateRowsDetailed(categoryRows);
        const readOnly = isCategoryReadOnly(categoryBudget);
        const dirty =
          categoryRows.some((row) => !row.isSaved) ||
          removedIds.length > 0;

        return [
          key,
          {
            categoryBudget,
            rows: categoryRows,
            validation,
            readOnly,
            dirty,
            itemCount: categoryRows.length,
            removedCount: removedIds.length,
          },
        ];
      }),
    );
  }, [
    categoryBudgets,
    isCategoryReadOnly,
    removedPersistedItemIdsByCategoryBudget,
    rowsByCategoryBudget,
  ]);

  const activeCategoryState =
    categoryStateById[String(activeCategoryBudgetId)] || null;

  const validationError = activeCategoryState?.validation || null;

  const invalidCategoryStates = useMemo(
    () =>
      Object.values(categoryStateById).filter(
        (state) => !state.readOnly && state.validation,
      ),
    [categoryStateById],
  );

  const dirtyCategoryStates = useMemo(
    () =>
      Object.values(categoryStateById).filter(
        (state) => !state.readOnly && state.dirty,
      ),
    [categoryStateById],
  );

  const activeCategoryIsDirty = Boolean(activeCategoryState?.dirty);

  const hasUnsavedChanges = dirtyCategoryStates.length > 0;
  const isDraftOperationPending =
    saving || savingAllDrafts || Boolean(switchingCategoryId);

  const formatCategoryList = useCallback(
    (states) =>
      states
        .map((state) => state.categoryBudget?.category_name)
        .filter(Boolean)
        .join(", "),
    [],
  );

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);

    return () => {
      setHasUnsavedChanges(false);
    };
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  const getRowSnapshot = useCallback((row) => {
    return JSON.stringify({
      category: row.category,
      item: row.item,
      method: row.method,
      quantity: row.quantity,
      monthly: row.monthly,
      quarterly: row.quarterly,
    });
  }, []);

  const withSavedState = useCallback((row) => {
    if (!row.savedSnapshot) return row;

    return {
      ...row,
      isSaved: row.savedSnapshot === getRowSnapshot(row),
    };
  }, [getRowSnapshot]);
  function getMonthlyAmountForSummary(row, monthIndex) {
    // notremoved
    if (row.method === "ANNUAL") {
      return monthIndex === 0 ? toNumber(row.quantity) : 0;
    }

    if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
      const monthly = getMonthlyDistribution(row);
      return toNumber(monthly[monthIndex]);
    }

    if (row.method === "QUARTERLY" || row.method === "CUSTOM_QUARTERLY") {
      const quarterly = getQuarterlyDistribution(row);

      if (monthIndex === 0) return toNumber(quarterly[0]);
      if (monthIndex === 3) return toNumber(quarterly[1]);
      if (monthIndex === 6) return toNumber(quarterly[2]);
      if (monthIndex === 9) return toNumber(quarterly[3]);

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

  async function saveCategoryDraft(categoryBudget, categoryRows, options = {}) {
    if (!categoryBudget?.id) return false;

    if (isCategoryReadOnly(categoryBudget)) {
      if (!options.silent) {
        toast.error(`${categoryBudget.category_name} is read-only`);
      }
      return false;
    }

    const categoryValidation = validateRowsDetailed(categoryRows);
    if (categoryValidation) {
      toast.error(`${categoryBudget.category_name}: ${categoryValidation}`, {
        duration: 4500,
      });
      return false;
    }

    await saveDraft(buildCategoryPayloadRows(categoryBudget, categoryRows), {
      departmentCategoryBudgetId: categoryBudget.id,
    });

    return true;
  }

  async function handleSaveAllDrafts() {
    if (saveDraftLockRef.current) {
      return false;
    }

    saveDraftLockRef.current = true;
    setSavingAllDrafts(true);

    try {
      if (invalidCategoryStates.length > 0) {
        toast.error(
          `Fix validation issues before saving: ${formatCategoryList(
            invalidCategoryStates,
          )}`,
          { duration: 5000 },
        );
        return false;
      }

      if (dirtyCategoryStates.length === 0) {
        toast.success("All category drafts are already saved");
        return true;
      }

      for (const state of dirtyCategoryStates) {
        const saved = await saveCategoryDraft(
          state.categoryBudget,
          state.rows,
          { silent: true },
        );

        if (!saved) return false;
      }

      toast.success("All category drafts saved");
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save drafts");
      return false;
    } finally {
      setSavingAllDrafts(false);
      saveDraftLockRef.current = false;
    }
  }

  async function handleCategoryTabClick(categoryBudget) {
    if (
      Number(categoryBudget.id) === Number(activeCategoryBudgetId) ||
      saving ||
      savingAllDrafts ||
      switchingCategoryId ||
      saveDraftLockRef.current
    ) {
      return;
    }

    const currentState = activeCategoryState;

    if (currentState && !currentState.readOnly && currentState.validation) {
      toast.error(
        `Fix ${currentState.categoryBudget.category_name} validation errors before switching category.`,
        { duration: 4500 },
      );
      return;
    }

    if (currentState && !currentState.readOnly && currentState.dirty) {
      setSwitchingCategoryId(categoryBudget.id);
      saveDraftLockRef.current = true;

      try {
        const saved = await saveCategoryDraft(
          currentState.categoryBudget,
          currentState.rows,
          { silent: true },
        );

        if (!saved) return;

        toast.success(
          `${currentState.categoryBudget.category_name} draft saved`,
        );
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            `Failed to save ${currentState.categoryBudget.category_name}`,
        );
        return;
      } finally {
        setSwitchingCategoryId(null);
        saveDraftLockRef.current = false;
      }
    }

    setActiveCategoryBudgetId(categoryBudget.id);
    setBudgetItemsPage(1);
    setLocalBudgetStatus(null);
  }

  async function handleSubmitBudget() {
    if (isBudgetLocked) {
      toast.error("This budget cannot be submitted");
      return;
    }

    if (!canSubmitActiveCategory) {
      toast.error(activeSubmissionWindowState.blockedMessage);
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

      const otherDirtyCategories = dirtyCategoryStates.filter(
        (state) =>
          Number(state.categoryBudget?.id) !==
          Number(activeCategoryBudget?.id),
      );

      if (otherDirtyCategories.length > 0) {
        toast.error(
          `Save all drafts before submitting ${activeCategoryName}. Unsaved: ${formatCategoryList(
            otherDirtyCategories,
          )}`,
          { duration: 5000 },
        );
        return;
      }

      if (validationError) {
        toast.error(validationError, { duration: 3500 });
        return;
      }

      if (activeCategoryIsDirty) {
        const saveSuccess = await handleSaveDraft();

        if (!saveSuccess) return;
      }

      if (!activeCategoryBudget?.id) {
        toast.error("No category budget selected");
        return;
      }

      await submitBudgetMutation.mutateAsync(activeCategoryBudget.id);
      await refreshBudget();
      setLocalBudgetStatus("IN_CATEGORY_REVIEW");
      setHasUnsavedChanges(false);
      toast.success("Category budget submitted for review");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit budget");
    }
  }
  const summary = useBudgetSummary(rows, getMonthlyAmountForSummary);
  const updateMonthly = useCallback(
    (id, index, value) => {
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

          return withSavedState({ ...row, monthly });
        }),
      );
    },
    [setRows, withSavedState],
  );

  const updateQuarterly = useCallback(
    (id, index, value) => {
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

          return withSavedState({ ...row, quarterly });
        }),
      );
    },
    [setRows, withSavedState],
  );
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
    if (isBudgetLocked || isDraftOperationPending) {
      toast.error(
        isBudgetLocked
          ? "Submitted category budgets are read-only."
          : "Wait for the current save to finish.",
      );
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const allTypes = await getAllBudgetTypes();

      const result = await importBudgetTemplate({
        file,
        rows: Object.values(rowsByCategoryBudget).flat(),
        allTypes,
        categoryBudgets,
      });

      if (result.importedRows.length > 0) {
        importRowsToCategoryBudgets(result.importedRows);
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

      if (validationError) {
        toast.error(validationError, { duration: 3500 });
        return false;
      }

      await saveCategoryDraft(activeCategoryBudget, rows);

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

        toast.success("Row removed from draft. Save drafts to persist it.");

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

  const duplicateTypeRowIds = getDuplicateTypeRowIds(rows);
  const totalBudgetItemsPages = useMemo(
    () => Math.max(1, Math.ceil(rows.length / BUDGET_ITEMS_PAGE_SIZE)),
    [rows.length],
  );
  const currentBudgetItemsPage = Math.min(
    budgetItemsPage,
    totalBudgetItemsPages,
  );

  const paginatedRows = useMemo(() => {
    const start = (currentBudgetItemsPage - 1) * BUDGET_ITEMS_PAGE_SIZE;
    return rows.slice(start, start + BUDGET_ITEMS_PAGE_SIZE);
  }, [rows, currentBudgetItemsPage]);
  const handleCopyBudget = (copiedRows) => {
    if (isBudgetLocked || isDraftOperationPending) {
      toast.error("Submitted category budgets are read-only.");
      return;
    }

    setRows((currentRows) => [
      ...currentRows,
      ...copiedRows.map((row) => ({
        ...row,
        category: activeCategoryBudget?.category_id ?? row.category,
        categoryName: activeCategoryBudget?.category_name ?? row.categoryName,
      })),
    ]);

    setBudgetItemsPage(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    toast.success(`${copiedRows.length} items added successfully`);
  };

  // if (pageLock.locked && !loadingSetup) {
  //   return lockedContent;
  // }

  return (
    <div className="space-y-5 p-6 text-slate-800">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Breadcrumbs />

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Department Budget Entry
          </h1>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRequestItemModalOpen(true)}
            disabled={isBudgetLocked || loadingSetup || isDraftOperationPending}
            title={isBudgetLocked ? "Submitted category budgets are read-only." : undefined}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PackagePlus size={17} />
            Request Item
          </button>

          <button
            type="button"
            onClick={handleSaveAllDrafts}
            disabled={loadingSetup || isDraftOperationPending}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={17} />
            {savingAllDrafts || saving ? "Saving..." : "Save All Drafts"}
          </button>

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            disabled={
              isBudgetLocked ||
              !canSubmitActiveCategory ||
              !!validationError ||
              isDraftOperationPending ||
              loadingSetup ||
              submitBudgetMutation.isPending
            }
            title={
              !canSubmitActiveCategory
                ? activeSubmissionWindowState.blockedMessage
                : isBudgetLocked
                  ? "Submitted category budgets are read-only."
                  : undefined
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={17} />
            {submitBudgetMutation.isPending
              ? "Submitting..."
              : canSubmitActiveCategory
                ? "Review and Submit"
                : "Submission Closed"}
          </button>
        </div>
      </div>
      {!loadingSetup && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 mt-2
      ${
        invalidCategoryStates.length > 0
          ? "border-red-200 bg-red-50 text-red-700"
          : hasUnsavedChanges
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    `}
        >
          {invalidCategoryStates.length > 0 ? (
            <>
              <AlertCircle size={16} />
              {`Validation issues in ${formatCategoryList(
                invalidCategoryStates,
              )}`}
            </>
          ) : hasUnsavedChanges ? (
            <>
              <AlertCircle size={16} />
              {`Unsaved changes in ${formatCategoryList(
                dirtyCategoryStates,
              )}`}
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              All category drafts are saved
            </>
          )}
        </div>
      )}
      {isBudgetLocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          This category budget is {budgetStatus.replaceAll("_", " ")}. It is
          read-only and cannot be edited.
        </div>
      )}
      <BudgetHeaderCard
        currentBudget={currentBudget}
        openYear={openYear}
        budgetStatus={budgetStatus}
      />
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Budget Items</h2>

          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div ref={excelMenuRef} className="relative">
              <button
                type="button"
                disabled={isBudgetLocked || isDraftOperationPending}
                title={isBudgetLocked ? "Submitted category budgets are read-only." : undefined}
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
                    Import requested quantities or download the latest template
                  </p>
                </div>

                <div className="p-3">
                  <button
                    type="button"
                    disabled={isBudgetLocked || isDraftOperationPending}
                    title={isBudgetLocked ? "Submitted category budgets are read-only." : undefined}
                    onClick={() => {
                      if (isBudgetLocked || isDraftOperationPending) return;
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
                        All catalog items with requested quantity only
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isBudgetLocked || isDraftOperationPending}
                    title={isBudgetLocked ? "Submitted category budgets are read-only." : undefined}
                    onClick={() => {
                      if (isBudgetLocked || isDraftOperationPending) return;
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
                        Import requested quantities across all categories
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
              disabled={isBudgetLocked || isDraftOperationPending}
              title={isBudgetLocked ? "Submitted category budgets are read-only." : undefined}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={17} />
              Copy From History
            </button>
            <div className="mx-2 hidden h-8 w-px bg-slate-200 md:block" />

            <button
              type="button"
              onClick={addItem}
              disabled={isBudgetLocked || isDraftOperationPending}
              title={isBudgetLocked ? "Submitted category budgets are read-only." : undefined}
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
        <div
          className="mb-4 grid gap-3 md:grid-cols-3"
          role="tablist"
          aria-label="Budget categories"
        >
          {categoryBudgets.map((categoryBudget) => {
            const active =
              Number(categoryBudget.id) ===
              Number(activeCategoryBudgetId);
            const categoryState =
              categoryStateById[String(categoryBudget.id)] || {};
            const count = categoryState.itemCount ?? 0;
            const isSwitching =
              Number(switchingCategoryId) === Number(categoryBudget.id);

            const label =
              categoryBudget.status?.replaceAll("_", " ") ||
              "DRAFT";

            const draftStateLabel = categoryState.readOnly
              ? "Read-only"
              : categoryState.validation
                ? "Invalid"
                : categoryState.dirty
                  ? "Unsaved"
                  : "Saved";

            const draftStateClassName = categoryState.readOnly
              ? "bg-slate-100 text-slate-600"
              : categoryState.validation
                ? "bg-red-50 text-red-700"
                : categoryState.dirty
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700";

            return (
              <button
                key={categoryBudget.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={isDraftOperationPending && !isSwitching}
                onClick={() => handleCategoryTabClick(categoryBudget)}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100",
                  active
                    ? "border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                  isDraftOperationPending && !isSwitching
                    ? "cursor-not-allowed opacity-70"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">
                      {categoryBudget.category_name}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      {count} item{count === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <CategorySubmissionWindowBadge
                      categoryBudget={categoryBudget}
                      financialYearStatus={financialYearStatus}
                    />
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${draftStateClassName}`}
                    >
                      {isSwitching ? "Saving..." : draftStateLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200/70 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Category budget status
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {label}
                  </p>
                  {categoryState.validation && (
                    <p className="mt-2 line-clamp-2 text-xs font-semibold text-red-600">
                      {categoryState.validation}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <CategorySubmissionWindowBanner
          categoryBudget={activeCategoryBudget}
          financialYearStatus={financialYearStatus}
        />

        <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <BudgetDistributionTable
            paginatedRows={paginatedRows}
            rows={rows}
            budgetItemsPage={currentBudgetItemsPage}
            categories={categories}
            typesByCategory={typesByCategory}
            methodOptions={methodOptions}
            duplicateTypeRowIds={duplicateTypeRowIds}
            deletingRowIds={deletingRowIds}
            isBudgetLocked={isBudgetLocked || isDraftOperationPending}
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
                {(currentBudgetItemsPage - 1) * BUDGET_ITEMS_PAGE_SIZE + 1}
              </span>
              {" - "}
              <span className="text-slate-900">
                {Math.min(
                  currentBudgetItemsPage * BUDGET_ITEMS_PAGE_SIZE,
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
                disabled={currentBudgetItemsPage <= 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                Page {currentBudgetItemsPage} / {totalBudgetItemsPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setBudgetItemsPage((page) =>
                    Math.min(totalBudgetItemsPages, page + 1),
                  )
                }
                disabled={currentBudgetItemsPage >= totalBudgetItemsPages}
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
                {validationError ||
                  `${activeCategoryName} items are valid. Save All Drafts will validate every category.`}
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
        title="Remove row from draft?"
        message="This row will be removed from this draft. Use Save All Drafts to persist the removal."
        confirmText="Remove Row"
        loading={isDraftOperationPending}
        onCancel={() => setDeleteRowId(null)}
        onConfirm={handleDeleteRowWithAnimation}
      />
      <ConfirmModal
        open={confirmSubmitOpen}
        title={`Submit ${activeCategoryBudgetLabel}?`}
        message={`You are about to submit the ${activeCategoryBudgetLabel} for review. This action applies only to the currently selected ${activeCategoryName} tab, not to the other category budgets.`}
        confirmText="Review and Submit"
        loading={submitBudgetMutation.isPending}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={async () => {
          setConfirmSubmitOpen(false);
          await handleSubmitBudget();
        }}
      >
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Category being submitted
          </p>
          <p className="mt-1 text-lg font-bold text-blue-900">
            {activeCategoryBudgetLabel}
          </p>
          <p className="mt-2 text-sm font-medium text-blue-800">
            IT, Biomedical, and General are submitted separately. Only this
            category budget will move to Category Manager review.
          </p>
        </div>
      </ConfirmModal>
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
      <RequestBudgetItemModal
        open={requestItemModalOpen}
        onClose={() => setRequestItemModalOpen(false)}
        categories={categories}
        defaultCategoryId={activeCategoryBudget?.category_id}
      />
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
