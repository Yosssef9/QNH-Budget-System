import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import Breadcrumbs from "../../components/Breadcrumbs";
import ConfirmModal from "../../components/ConfirmModal";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import {
  getDistributedQuantity,
  getMonthlyDistribution,
  getQuarterlyDistribution,
  normalizeArray,
} from "../../helpers/budgetCalculations.helper";
import {
  getApiDistributionLevel,
  getApiDistributionMethod,
  getApiDistributionRows,
} from "../../helpers/budgetPayload.helper";
import { toNumber } from "../../utils/number";
import { MONTHS } from "../../constants/months.constants";
import { BUDGET_METHOD_OPTIONS } from "../../constants/budgetMethodOptions.constants";
import { useSetupTypes } from "../../hooks/budgets/useBudgetSetup";
import {
  useCategoryBudgetItems,
  useCreateRequestItem,
  useCurrentBudgetRequest,
  useDeleteRequestItem,
  useSubmitCategoryBudget,
  useUpdateRequestItem,
} from "../../hooks/budget-requests/useBudgetRequests";

const QUARTERS = [
  { label: "Q1", title: "QUARTER 1", hint: "Jan - Mar", className: "bg-blue-50" },
  {
    label: "Q2",
    title: "QUARTER 2",
    hint: "Apr - Jun",
    className: "bg-emerald-50",
  },
  {
    label: "Q3",
    title: "QUARTER 3",
    hint: "Jul - Sep",
    className: "bg-orange-50",
  },
  {
    label: "Q4",
    title: "QUARTER 4",
    hint: "Oct - Dec",
    className: "bg-violet-50",
  },
];

const LOCAL_DRAFT_KEY_PREFIX = "department_budget_request_category_draft";

function createRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `new-${crypto.randomUUID()}`;
  }

  return `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCategoryDraftKey({ currentRequest, categoryBudgetId }) {
  const financialYearId = currentRequest?.financialYear?.id;
  const departmentBudgetId = currentRequest?.departmentBudget?.id;
  const departmentId = currentRequest?.departmentBudget?.department_id;

  if (!financialYearId || !departmentBudgetId || !categoryBudgetId) {
    return null;
  }

  return [
    LOCAL_DRAFT_KEY_PREFIX,
    `fy-${financialYearId}`,
    `dept-${departmentId || "unknown"}`,
    `budget-${departmentBudgetId}`,
    `category-${categoryBudgetId}`,
  ].join("_");
}

function readRowsDraft(key) {
  if (!key || typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.map(normalizeDraftRow);
    }

    localStorage.removeItem(key);
    return null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeRowsDraft(key, rows) {
  if (!key || typeof localStorage === "undefined") return;

  localStorage.setItem(key, JSON.stringify(rows.map(getDraftRowSnapshot)));
}

function clearRowsDraft(key) {
  if (!key || typeof localStorage === "undefined") return;

  localStorage.removeItem(key);
}

function getDraftRowSnapshot(row) {
  return {
    ...row,
    monthly: normalizeArray(row.monthly, 12),
    quarterly: normalizeArray(row.quarterly, 4),
  };
}

function normalizeDraftRow(row) {
  return {
    ...createEmptyRow(),
    ...row,
    id: row.id || createRowId(),
    budgetTypeId: row.budgetTypeId || "",
    quantity: toNumber(row.quantity),
    method: row.method || "ANNUAL",
    monthly: normalizeArray(row.monthly, 12),
    quarterly: normalizeArray(row.quarterly, 4),
    isSaved: row.isSaved === true,
    isEditLocked: row.isEditLocked === true,
  };
}

function getStatusClasses(status) {
  switch (status) {
    case "SUBMITTED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "RETURNED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "DRAFT":
      return "bg-slate-50 text-slate-600 border-slate-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

function getUiMethod(item) {
  if (item.distribution_method === "CUSTOM") {
    return item.distribution_level === "MONTH"
      ? "CUSTOM_MONTHLY"
      : "CUSTOM_QUARTERLY";
  }

  if (item.distribution_method === "MONTHLY") return "MONTHLY";
  if (item.distribution_method === "QUARTERLY") return "QUARTERLY";

  return "ANNUAL";
}

function mapDistribution(item, periodType, length) {
  const values = Array.from({ length }, () => 0);

  item.distribution
    ?.filter((period) => period.period_type === periodType)
    .forEach((period) => {
      const index = Number(period.period_no || 0) - 1;

      if (index >= 0 && index < length) {
        values[index] = toNumber(period.quantity);
      }
    });

  return values;
}

function createEmptyRow() {
  return {
    id: createRowId(),
    requestItemId: null,
    budgetTypeId: "",
    quantity: 0,
    method: "ANNUAL",
    monthly: Array.from({ length: 12 }, () => 0),
    quarterly: Array.from({ length: 4 }, () => 0),
    isSaved: false,
    isEditLocked: false,
    reviewNote: null,
  };
}

function mapApiItemToRow(item) {
  return {
    id: `saved-${item.id}`,
    requestItemId: item.id,
    budgetTypeId: item.budget_type_id,
    budgetTypeName: item.budget_type_name,
    expenseType: item.expense_type,
    quantity: toNumber(item.requested_quantity),
    method: getUiMethod(item),
    monthly: mapDistribution(item, "MONTH", 12),
    quarterly: mapDistribution(item, "QUARTER", 4),
    isSaved: true,
    isEditLocked: item.is_edit_locked === true,
    isReviewed: item.is_reviewed === true,
    reviewStatus: item.review_status,
    reviewNote: item.review_note,
  };
}

function getDuplicateTypeRowIds(rows) {
  const seen = new Map();
  const duplicateIds = new Set();

  rows.forEach((row) => {
    if (!row.budgetTypeId) return;

    const key = String(row.budgetTypeId);

    if (seen.has(key)) {
      duplicateIds.add(seen.get(key));
      duplicateIds.add(row.id);
    } else {
      seen.set(key, row.id);
    }
  });

  return duplicateIds;
}

function validateRows(rows) {
  const usedTypes = new Set();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 1;

    if (!row.budgetTypeId) {
      return `Row ${rowNumber}: Please select item/type`;
    }

    const key = String(row.budgetTypeId);

    if (usedTypes.has(key)) {
      return `Row ${rowNumber}: This item/type is already added in this category`;
    }

    usedTypes.add(key);

    if (toNumber(row.quantity) <= 0) {
      return `Row ${rowNumber}: Quantity must be greater than 0`;
    }

    if (!row.method) {
      return `Row ${rowNumber}: Please select distribution method`;
    }

    if (row.method !== "ANNUAL") {
      const distributed = getDistributedQuantity({
        ...row,
        item: row.budgetTypeId,
      });

      if (distributed !== toNumber(row.quantity)) {
        return `Row ${rowNumber}: Distribution does not match total quantity`;
      }
    }
  }

  return null;
}

function clampDistributionValues(values, length, totalQuantity) {
  let remaining = Math.max(0, toNumber(totalQuantity));

  return normalizeArray(values, length).map((value) => {
    const nextValue = Math.min(toNumber(value), remaining);
    remaining -= nextValue;
    return nextValue;
  });
}

function buildPayload(row) {
  const payloadRow = {
    ...row,
    item: row.budgetTypeId,
  };

  return {
    budget_type_id: Number(row.budgetTypeId),
    requested_quantity: toNumber(row.quantity),
    distribution_method: getApiDistributionMethod(row.method),
    distribution_level: getApiDistributionLevel(row.method),
    distribution: getApiDistributionRows(payloadRow),
  };
}

export default function DepartmentBudgetRequestsPage() {
  const [selectedCategoryBudgetId, setSelectedCategoryBudgetId] = useState("");
  const [rows, setRows] = useState([]);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [rowsInitializedFrom, setRowsInitializedFrom] = useState(null);

  const { setHasUnsavedChanges } = useUnsavedChanges();
  const { data: currentRequest, isLoading: loadingCurrent } =
    useCurrentBudgetRequest();

  const categoryBudgets = currentRequest?.categoryBudgets || [];
  const selectedCategoryBudget = categoryBudgets.find(
    (category) => String(category.id) === String(selectedCategoryBudgetId),
  );
  const selectedDraftKey = useMemo(
    () =>
      getCategoryDraftKey({
        currentRequest,
        categoryBudgetId: selectedCategoryBudgetId,
      }),
    [currentRequest, selectedCategoryBudgetId],
  );

  const { data: categoryItemsData, isLoading: loadingItems } =
    useCategoryBudgetItems(selectedCategoryBudgetId);

  const { data: budgetTypes = [], isLoading: loadingTypes } = useSetupTypes(
    selectedCategoryBudget?.category_id,
  );

  const createRequestItemMutation = useCreateRequestItem();
  const updateRequestItemMutation = useUpdateRequestItem();
  const deleteRequestItemMutation = useDeleteRequestItem();
  const submitCategoryBudgetMutation = useSubmitCategoryBudget();

  const hasUnsavedChanges = useMemo(
    () => rows.some((row) => !row.isSaved),
    [rows],
  );

  const validationError = useMemo(() => validateRows(rows), [rows]);
  const duplicateRowIds = useMemo(() => getDuplicateTypeRowIds(rows), [rows]);

  const isCategoryEditable = ["DRAFT", "RETURNED"].includes(
    selectedCategoryBudget?.status,
  );

  const canSubmit =
    isCategoryEditable &&
    rows.length > 0 &&
    !validationError &&
    !hasUnsavedChanges;

  useEffect(() => {
    if (!selectedCategoryBudgetId && categoryBudgets.length > 0) {
      setSelectedCategoryBudgetId(String(categoryBudgets[0].id));
    }
  }, [categoryBudgets, selectedCategoryBudgetId]);

  useEffect(() => {
    const localRows = readRowsDraft(selectedDraftKey);

    if (localRows) {
      setRows(localRows);
    } else if (
      categoryItemsData?.categoryBudget?.id &&
      String(categoryItemsData.categoryBudget.id) ===
        String(selectedCategoryBudgetId)
    ) {
      setRows((categoryItemsData.items || []).map(mapApiItemToRow));
    } else {
      setRows([]);
    }

    setRowsInitializedFrom(selectedDraftKey);
  }, [categoryItemsData, selectedCategoryBudgetId, selectedDraftKey]);

  useEffect(() => {
    if (!selectedDraftKey) return;
    if (rowsInitializedFrom !== selectedDraftKey) return;
    if (!selectedCategoryBudget) return;
    if (!isCategoryEditable) return;

    if (hasUnsavedChanges) {
      writeRowsDraft(selectedDraftKey, rows);
    } else {
      clearRowsDraft(selectedDraftKey);
    }
  }, [
    hasUnsavedChanges,
    isCategoryEditable,
    rows,
    rowsInitializedFrom,
    selectedCategoryBudget,
    selectedDraftKey,
  ]);

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);

    return () => setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  function updateRow(rowId, field, value) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row;

        const nextRow = { ...row, [field]: value, isSaved: false };

        if (field === "quantity") {
          nextRow.monthly = clampDistributionValues(row.monthly, 12, value);
          nextRow.quarterly = clampDistributionValues(row.quarterly, 4, value);
        }

        if (field === "method") {
          if (value === "CUSTOM_MONTHLY") {
            nextRow.monthly = normalizeArray(getMonthlyDistribution(row), 12);
          }

          if (value === "CUSTOM_QUARTERLY") {
            nextRow.quarterly = normalizeArray(getQuarterlyDistribution(row), 4);
          }
        }

        return nextRow;
      }),
    );
  }

  function updateMonthly(rowId, index, value) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row;

        const monthly = normalizeArray(row.monthly, 12);
        const totalQuantity = toNumber(row.quantity);
        const otherMonthsTotal = monthly.reduce(
          (sum, qty, monthIndex) =>
            monthIndex === index ? sum : sum + toNumber(qty),
          0,
        );
        const maxAllowed = Math.max(0, totalQuantity - otherMonthsTotal);

        monthly[index] = Math.min(toNumber(value), maxAllowed);

        return { ...row, monthly, isSaved: false };
      }),
    );
  }

  function updateQuarterly(rowId, index, value) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row;

        const quarterly = normalizeArray(row.quarterly, 4);
        const totalQuantity = toNumber(row.quantity);
        const otherQuartersTotal = quarterly.reduce(
          (sum, qty, quarterIndex) =>
            quarterIndex === index ? sum : sum + toNumber(qty),
          0,
        );
        const maxAllowed = Math.max(0, totalQuantity - otherQuartersTotal);

        quarterly[index] = Math.min(toNumber(value), maxAllowed);

        return { ...row, quarterly, isSaved: false };
      }),
    );
  }

  async function saveRows() {
    if (!selectedCategoryBudgetId) return false;

    if (rows.length === 0) {
      toast.error("Please add at least one item before saving");
      return false;
    }

    if (validationError) {
      toast.error(validationError);
      return false;
    }

    try {
      for (const row of rows.filter((item) => !item.isSaved)) {
        const payload = buildPayload(row);

        if (row.requestItemId) {
          await updateRequestItemMutation.mutateAsync({
            requestItemId: row.requestItemId,
            payload,
          });
        } else {
          await createRequestItemMutation.mutateAsync({
            categoryBudgetId: selectedCategoryBudgetId,
            payload,
          });
        }
      }

      toast.success("Category budget saved successfully");
      clearRowsDraft(selectedDraftKey);
      setRowsInitializedFrom(null);
      return true;
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save category budget",
      );
      return false;
    }
  }

  async function handleSubmitCategoryBudget() {
    if (!selectedCategoryBudgetId) return;

    if (hasUnsavedChanges) {
      toast.error("Save your changes before submitting this category");
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await submitCategoryBudgetMutation.mutateAsync({
        categoryBudgetId: selectedCategoryBudgetId,
      });

      clearRowsDraft(selectedDraftKey);
      setRowsInitializedFrom(null);
      toast.success("Category budget submitted for review");
      setConfirmSubmitOpen(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to submit category budget",
      );
    }
  }

  async function handleDeleteRow() {
    if (!deleteRow) return;

    try {
      if (deleteRow.requestItemId) {
        await deleteRequestItemMutation.mutateAsync(deleteRow.requestItemId);
      }

      setRows((currentRows) =>
        currentRows.filter((row) => row.id !== deleteRow.id),
      );
      toast.success("Item deleted successfully");
      setDeleteRow(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete item");
    }
  }

  const saving =
    createRequestItemMutation.isPending || updateRequestItemMutation.isPending;

  const deleting = deleteRequestItemMutation.isPending;

  if (loadingCurrent) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={18} />
        Loading department budget request...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 text-slate-800">
      <div>
        <Breadcrumbs />

        <div className="mt-3 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Department Budget Requests
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Enter the department need, quantity, and distribution method only.
              Pricing and technical specifications are completed later by the
              Category Budget Manager.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="font-semibold text-slate-500">Financial Year</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {currentRequest?.financialYear?.year || "-"}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        {categoryBudgets.map((categoryBudget) => {
          const isSelected =
            String(categoryBudget.id) === String(selectedCategoryBudgetId);

          return (
            <button
              key={categoryBudget.id}
              type="button"
              onClick={() => setSelectedCategoryBudgetId(String(categoryBudget.id))}
              className={[
                "rounded-2xl border bg-white p-5 text-left shadow-sm transition",
                isSelected
                  ? "border-blue-300 ring-4 ring-blue-50"
                  : "border-slate-200 hover:border-blue-200 hover:bg-blue-50/30",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {categoryBudget.category_name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {Number(categoryBudget.items_count || 0)} item(s),{" "}
                    {Number(
                      categoryBudget.total_requested_quantity || 0,
                    ).toLocaleString()}{" "}
                    requested
                  </p>
                </div>

                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-bold",
                    getStatusClasses(categoryBudget.status),
                  ].join(" ")}
                >
                  {categoryBudget.status || "DRAFT"}
                </span>
              </div>

              {categoryBudget.return_note && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  Return note: {categoryBudget.return_note}
                </div>
              )}
            </button>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedCategoryBudget?.category_name || "Category"} Request
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Add each requested item once. Duplicate item/type rows are not
              allowed inside the same category.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRows((currentRows) => [...currentRows, createEmptyRow()])}
              disabled={!isCategoryEditable || loadingItems}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              Add Item
            </button>

            <button
              type="button"
              onClick={saveRows}
              disabled={!isCategoryEditable || saving || !hasUnsavedChanges || Boolean(validationError)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              Save
            </button>

            <button
              type="button"
              onClick={() => setConfirmSubmitOpen(true)}
              disabled={!canSubmit || submitCategoryBudgetMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} />
              Submit Category
            </button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mx-5 mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            You have unsaved changes. Save them before submitting this category.
          </div>
        )}

        {validationError && (
          <div className="mx-5 mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={16} />
            {validationError}
          </div>
        )}

        {!isCategoryEditable && selectedCategoryBudget && (
          <div className="mx-5 mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            <Lock size={16} />
            This category is {selectedCategoryBudget.status} and cannot be
            modified.
          </div>
        )}

        <div className="p-5">
          {loadingItems || loadingTypes ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Loading category items...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">
              No items in this category yet. Click Add Item to start.
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[1580px] table-fixed border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-white">
                  <tr className="text-slate-700">
                    <th
                      rowSpan="2"
                      className="w-[70px] border border-slate-200 px-3 py-4"
                    >
                      #
                    </th>
                    <th
                      rowSpan="2"
                      className="w-[280px] border border-slate-200 px-4 py-4"
                    >
                      Item / Type
                    </th>
                    <th
                      rowSpan="2"
                      className="w-[180px] border border-slate-200 px-4 py-4"
                    >
                      Distribution
                    </th>
                    <th
                      rowSpan="2"
                      className="w-[140px] border border-slate-200 px-4 py-4"
                    >
                      Total Quantity
                    </th>
                    {QUARTERS.map((quarter) => (
                      <th
                        key={quarter.label}
                        colSpan="3"
                        className={[
                          "border border-slate-200 px-4 py-3",
                          quarter.className,
                        ].join(" ")}
                      >
                        {quarter.title}
                        <br />
                        <span className="text-xs font-medium">
                          {quarter.hint}
                        </span>
                      </th>
                    ))}
                    <th
                      rowSpan="2"
                      className="w-[170px] border border-slate-200 px-4 py-4"
                    >
                      Status
                    </th>
                    <th
                      rowSpan="2"
                      className="w-[90px] border border-slate-200 px-4 py-4"
                    >
                      Actions
                    </th>
                  </tr>

                  <tr>
                    {MONTHS.map((month) => (
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
                  {rows.map((row, index) => {
                    const rowLocked = !isCategoryEditable || row.isEditLocked;
                    const isDuplicate = duplicateRowIds.has(row.id);
                    const distributedQuantity = getDistributedQuantity({
                      ...row,
                      item: row.budgetTypeId,
                    });
                    const distributionMismatch =
                      row.method !== "ANNUAL" &&
                      distributedQuantity !== toNumber(row.quantity);

                    return (
                      <tr
                        key={row.id}
                        className={[
                          "transition",
                          row.isEditLocked
                            ? "bg-slate-50"
                            : isDuplicate || distributionMismatch
                              ? "bg-red-50"
                              : row.reviewNote
                                ? "bg-amber-50"
                                : "bg-white",
                        ].join(" ")}
                      >
                        <td className="truncate border border-slate-200 px-3 py-4 text-center font-semibold text-slate-600">
                          <div className="flex flex-col items-center gap-1">
                            <span>{index + 1}</span>
                            {!row.isSaved && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Unsaved
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="border border-slate-200 px-3 py-4">
                          <div className="w-full min-w-[220px]">
                            <SearchableMultiSelect
                              multiple={false}
                              disableClear
                              disabled={rowLocked || Boolean(row.requestItemId)}
                              value={row.budgetTypeId}
                              onChange={(event) =>
                                updateRow(
                                  row.id,
                                  "budgetTypeId",
                                  event.target.value
                                    ? Number(event.target.value)
                                    : "",
                                )
                              }
                              options={budgetTypes}
                              getOptionValue={(item) => item.id}
                              getOptionLabel={(item) => item.name}
                              placeholder="Select item/type"
                              searchPlaceholder="Search item/type..."
                            />
                          </div>

                          {isDuplicate && (
                            <p className="mt-2 flex items-center gap-1 text-xs font-bold text-red-600">
                              <AlertCircle size={13} />
                              Duplicate item/type
                            </p>
                          )}

                          {row.reviewNote && (
                            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                              Review note: {row.reviewNote}
                            </p>
                          )}
                        </td>

                        <td className="border border-slate-200 px-3 py-4 align-middle">
                          <div className="w-full min-w-[170px]">
                            <SearchableMultiSelect
                              multiple={false}
                              disableClear
                              disabled={rowLocked}
                              value={row.method}
                              onChange={(event) =>
                                updateRow(row.id, "method", event.target.value)
                              }
                              options={BUDGET_METHOD_OPTIONS}
                              placeholder="Method"
                              searchPlaceholder="Search method..."
                            />
                          </div>
                        </td>

                        <td className="border border-slate-200 px-3 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            disabled={rowLocked}
                            value={row.quantity === 0 ? "" : row.quantity}
                            onChange={(event) =>
                              updateRow(row.id, "quantity", toNumber(event.target.value))
                            }
                            className={[
                              "h-10 w-24 rounded-lg border px-3 text-center text-sm font-bold outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
                              toNumber(row.quantity) <= 0
                                ? "border-red-300 bg-red-50 text-red-600"
                                : "border-slate-200 bg-white text-slate-700 focus:border-blue-300 focus:ring-2 focus:ring-blue-100",
                            ].join(" ")}
                          />
                        </td>

                        <DistributionCells
                          row={row}
                          disabled={rowLocked}
                          onMonthlyChange={updateMonthly}
                          onQuarterlyChange={updateQuarterly}
                        />

                        <td className="border border-slate-200 px-3 py-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <RowStatusBadge row={row} />

                            {distributionMismatch && (
                              <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                                <AlertCircle size={13} />
                                {distributedQuantity} / {toNumber(row.quantity)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="border border-slate-200 px-3 py-4 text-center">
                          <button
                            type="button"
                            disabled={rowLocked}
                            onClick={() => setDeleteRow(row)}
                            className="rounded-lg bg-red-50 p-2 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={confirmSubmitOpen}
        title="Submit category budget?"
        message="After submission, this category budget goes to the Category Budget Manager and becomes read-only unless it is returned."
        confirmText="Submit Category"
        loading={submitCategoryBudgetMutation.isPending}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={handleSubmitCategoryBudget}
      />

      <ConfirmModal
        open={Boolean(deleteRow)}
        danger
        title="Delete item?"
        message="This item will be removed from this department category budget."
        confirmText="Delete"
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDeleteRow}
      />
    </div>
  );
}

function RowStatusBadge({ row }) {
  if (row.isEditLocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 size={13} />
        Reviewed
      </span>
    );
  }

  if (row.isSaved) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
        Saved
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
      Unsaved
    </span>
  );
}

function DistributionCells({ row, disabled, onMonthlyChange, onQuarterlyChange }) {
  const quantity = toNumber(row.quantity);

  if (row.method === "ANNUAL") {
    return (
      <td
        colSpan="12"
        className="border border-slate-200 px-3 py-4 text-center"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-slate-800">
            {quantity.toLocaleString()} unit(s) / year
          </span>
          <span className="text-xs font-semibold text-slate-500">
            No monthly distribution
          </span>
        </div>
      </td>
    );
  }

  if (row.method === "MONTHLY" || row.method === "CUSTOM_MONTHLY") {
    const monthly =
      row.method === "MONTHLY"
        ? getMonthlyDistribution(row)
        : normalizeArray(row.monthly, 12);

    return monthly.map((qty, index) => (
      <td
        key={MONTHS[index]}
        className="border border-slate-200 px-2 py-2 text-center"
      >
        <DistributionQuantityInput
          value={qty}
          disabled={disabled || row.method === "MONTHLY"}
          onChange={(value) => onMonthlyChange(row.id, index, value)}
        />
      </td>
    ));
  }

  const quarterly =
    row.method === "QUARTERLY"
      ? getQuarterlyDistribution(row)
      : normalizeArray(row.quarterly, 4);

  return quarterly.map((qty, index) => (
    <td
      key={QUARTERS[index].label}
      colSpan="3"
      className="border border-slate-200 px-2 py-2 text-center"
    >
      <DistributionQuantityInput
        wide
        value={qty}
        disabled={disabled || row.method === "QUARTERLY"}
        onChange={(value) => onQuarterlyChange(row.id, index, value)}
      />
    </td>
  ));
}

function DistributionQuantityInput({ value, disabled, wide = false, onChange }) {
  return (
    <input
      type="number"
      min="0"
      disabled={disabled}
      value={toNumber(value) === 0 ? "" : value}
      onChange={(event) => onChange(event.target.value)}
      className={[
        "mx-auto h-8 rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
        wide ? "w-28" : "w-16",
      ].join(" ")}
    />
  );
}
