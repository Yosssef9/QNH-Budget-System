import { useEffect, useState, useCallback } from "react";
import {
  replaceBudgetItems,
  deleteBudgetItem,
  getBudgetItems,
  getCategories,
  getCurrentBudget,
  getTypesByCategory,
} from "../../api/budget.api";
import { getCurrentFinancialYear } from "../../api/financialYears.api";
import { toastPromise } from "../../helpers/toast.helper";
import { createRow, mapBudgetItemToRow } from "../../helpers/budgetRows.helper";
import toast from "react-hot-toast";

const LOCAL_DRAFT_KEY = "create_budget_manual_draft_rows";

function getBudgetDraftKey(budgetId) {
  return `${LOCAL_DRAFT_KEY}_${budgetId}`;
}

function getRowSnapshot(row) {
  return JSON.stringify({
    category: row.category,
    item: row.item,
    method: row.method,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    monthly: row.monthly,
    quarterly: row.quarterly,
  });
}

function getRowsFromLocalStorage(key) {
  const savedLocalRows = localStorage.getItem(key);

  if (!savedLocalRows) return null;

  try {
    const parsedRows = JSON.parse(savedLocalRows);

    if (Array.isArray(parsedRows)) {
      return parsedRows;
    }

    localStorage.removeItem(key);
    return null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function useCreateBudgetManual() {
  const [currentBudget, setCurrentBudget] = useState(null);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [typesByCategory, setTypesByCategory] = useState({});
  const [openYear, setOpenYear] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [saving, setSaving] = useState(false);
  function mergeExistingBudgetCategories(budgetItems) {
    setCategories((prev) => {
      const merged = [...prev];

      for (const item of budgetItems) {
        if (!item.category_id) continue;

        const alreadyExists = merged.some(
          (category) => Number(category.id) === Number(item.category_id),
        );

        if (!alreadyExists) {
          merged.push({
            id: item.category_id,
            name:
              item.category_is_active === true || item.category_is_active === 1
                ? item.category_name
                : `${item.category_name} (Inactive)`,

            is_active: item.category_is_active,

            isExistingInactive: !(
              item.category_is_active === true || item.category_is_active === 1
            ),
          });
        }
      }

      return merged;
    });
  }
  function mergeExistingBudgetTypes(budgetItems) {
    const grouped = {};

    for (const item of budgetItems) {
      if (!item.category_id || !item.type_id) continue;

      const categoryId = String(item.category_id);

      if (!grouped[categoryId]) grouped[categoryId] = [];

      grouped[categoryId].push({
        id: item.type_id,
        category_id: item.category_id,
        name:
          item.type_is_active === true || item.type_is_active === 1
            ? item.type_name
            : `${item.type_name} (Inactive)`,
        expense_type: item.expense_type,
        is_active: item.type_is_active,
        isExistingInactive: !(
          item.type_is_active === true || item.type_is_active === 1
        ),
      });
    }

    setTypesByCategory((prev) => {
      const next = { ...prev };

      for (const [categoryId, existingTypes] of Object.entries(grouped)) {
        const current = next[categoryId] || [];
        const merged = [...current];

        for (const existingType of existingTypes) {
          const alreadyExists = merged.some(
            (type) => Number(type.id) === Number(existingType.id),
          );

          if (!alreadyExists) {
            merged.push(existingType);
          }
        }

        next[categoryId] = merged;
      }

      return next;
    });
  }
  useEffect(() => {
    let ignore = false;

    async function loadSetup() {
      try {
        const [budgetResult, yearResult, categoryResult] = await toastPromise(
          Promise.all([
            getCurrentBudget(),
            getCurrentFinancialYear(),
            getCategories(),
          ]),
          {
            loading: "Loading budget setup...",
            success: "Budget setup loaded",
            error: "Failed to load budget setup data",
          },
        );

        if (ignore) return;

        setCurrentBudget(budgetResult);
        setOpenYear(yearResult);
        setCategories(categoryResult);

        const budgetItems = budgetResult?.id
          ? await getBudgetItems(budgetResult.id)
          : [];

        if (ignore) return;

        const budgetId = budgetResult?.id;
        const budgetStatus = budgetResult?.status || "DRAFT";

        if (!budgetId) {
          setRows([]);
          return;
        }

        const budgetDraftKey = getBudgetDraftKey(budgetId);

        if (
          ["PENDING_APPROVAL", "APPROVED", "CANCELLED"].includes(budgetStatus)
        ) {
          localStorage.removeItem(budgetDraftKey);
          setRows(budgetItems.map(mapBudgetItemToRow));
          mergeExistingBudgetTypes(budgetItems);
          mergeExistingBudgetCategories(budgetItems);
          return;
        }

        const localRows = getRowsFromLocalStorage(budgetDraftKey);

        if (localRows) {
          setRows(localRows);
          return;
        }

        setRows(budgetItems.map(mapBudgetItemToRow));
        mergeExistingBudgetTypes(budgetItems);
        mergeExistingBudgetCategories(budgetItems);
      } finally {
        if (!ignore) setLoadingSetup(false);
      }
    }

    loadSetup();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (loadingSetup) return;
    if (!currentBudget?.id) return;

    const budgetStatus = currentBudget?.status || "DRAFT";
    const budgetDraftKey = getBudgetDraftKey(currentBudget.id);

    if (["PENDING_APPROVAL", "APPROVED", "CANCELLED"].includes(budgetStatus)) {
      localStorage.removeItem(budgetDraftKey);
      return;
    }

    localStorage.setItem(budgetDraftKey, JSON.stringify(rows));
  }, [rows, loadingSetup, currentBudget]);

  useEffect(() => {
    const categoryIds = [
      ...new Set(rows.map((row) => row.category).filter(Boolean)),
    ];

    const missingIds = categoryIds.filter(
      (categoryId) => !typesByCategory[categoryId],
    );

    if (missingIds.length === 0) return;

    let ignore = false;

    async function loadTypes() {
      const entries = await Promise.all(
        missingIds.map(async (categoryId) => {
          const data = await getTypesByCategory(categoryId);
          return [categoryId, Array.isArray(data) ? data : []];
        }),
      );

      if (!ignore) {
        setTypesByCategory((prev) => ({
          ...prev,
          ...Object.fromEntries(entries),
        }));
      }
    }

    toastPromise(loadTypes(), {
      loading: "Loading item types...",
      success: "Item types loaded",
      error: "Failed to load category types",
    });

    return () => {
      ignore = true;
    };
  }, [rows, typesByCategory]);

  const updateRow = useCallback((id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, [field]: value };

        if (field === "category") {
          next.item = "";
        }

        const nextSnapshot = getRowSnapshot(next);

        return {
          ...next,
          isSaved: row.savedSnapshot === nextSnapshot,
        };
      }),
    );
  }, []);

  const addItem = useCallback(() => {
    setRows((prev) => [
      createRow(Date.now(), categories[0]?.id || "", "", "MONTHLY", 0, 0),
      ...prev,
    ]);
  }, [categories]);

  const deleteItem = useCallback(
    async (id) => {
      const rowToDelete = rows.find((row) => row.id === id);
      if (!rowToDelete) return;

      const previousRows = rows;

      setRows((prev) => prev.filter((row) => row.id !== id));

      if (rowToDelete.isNew) {
        return;
      }

      if (!currentBudget?.id) {
        setRows(previousRows);
        toast.error("Current budget was not loaded");
        return;
      }

      try {
        await toastPromise(deleteBudgetItem(currentBudget.id, id), {
          loading: "Deleting item...",
          success: "Item deleted successfully",
          error: "Failed to delete item",
        });
      } catch {
        setRows(previousRows);
      }
    },
    [rows, currentBudget],
  );

  const saveDraft = useCallback(
    async (payloadRows) => {
      setSaving(true);

      try {
        const budgetId = currentBudget?.id;

        if (!budgetId) {
          throw new Error("Current draft budget was not loaded");
        }

        await toastPromise(replaceBudgetItems(budgetId, payloadRows), {
          loading: "Saving budget draft...",
          success: "Budget draft saved successfully",
          error: "Failed to save budget",
        });

        const savedItems = await getBudgetItems(budgetId);

        setRows(savedItems.map(mapBudgetItemToRow));

        mergeExistingBudgetTypes(savedItems);
        mergeExistingBudgetCategories(savedItems);

        localStorage.removeItem(getBudgetDraftKey(budgetId));
      } finally {
        setSaving(false);
      }
    },
    [currentBudget],
  );

  return {
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
  };
}
