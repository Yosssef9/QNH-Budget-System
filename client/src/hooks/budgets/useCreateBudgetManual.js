import { useEffect, useMemo, useState, useCallback } from "react";
import {
  getCategories,
  getCurrentBudget,
  getTypesByCategory,
  replaceBudgetItems,
} from "../../api/budget.api";
import { getCurrentFinancialYear } from "../../api/financialYears.api";
import { toastPromise } from "../../helpers/toast.helper";
import { createRow, mapBudgetItemToRow } from "../../helpers/budgetRows.helper";

const LOCAL_DRAFT_KEY = "department_category_budget_draft_rows";

function getBudgetDraftKey(departmentCategoryBudgetId) {
  return `${LOCAL_DRAFT_KEY}_${departmentCategoryBudgetId}`;
}

function getRowSnapshot(row) {
  return JSON.stringify({
    category: row.category,
    item: row.item,
    method: row.method,
    quantity: row.quantity,
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

function mapRowsByCategoryBudget(categoryBudgets = []) {
  return Object.fromEntries(
    categoryBudgets.map((categoryBudget) => [
      String(categoryBudget.id),
      lockRowsToCategory(
        (categoryBudget.items || []).map(mapBudgetItemToRow),
        categoryBudget.category_id,
      ),
    ]),
  );
}

function lockRowsToCategory(rows = [], categoryId) {
  if (!categoryId) return rows;

  return rows.map((row) => ({
    ...row,
    category: Number(categoryId),
  }));
}

export function useCreateBudgetManual() {
  const [currentBudget, setCurrentBudget] = useState(null);
  const [rowsByCategoryBudget, setRowsByCategoryBudget] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [activeCategoryBudgetId, setActiveCategoryBudgetId] = useState(null);
  const [typesByCategory, setTypesByCategory] = useState({});
  const [openYear, setOpenYear] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [saving, setSaving] = useState(false);
  const [
    removedPersistedItemIdsByCategoryBudget,
    setRemovedPersistedItemIdsByCategoryBudget,
  ] = useState({});

  const activeCategoryBudget = useMemo(
    () =>
      categoryBudgets.find(
        (categoryBudget) =>
          Number(categoryBudget.id) === Number(activeCategoryBudgetId),
      ) || categoryBudgets[0] || null,
    [categoryBudgets, activeCategoryBudgetId],
  );

  const rows = useMemo(() => {
    if (!activeCategoryBudget?.id) return [];
    return rowsByCategoryBudget[String(activeCategoryBudget.id)] || [];
  }, [activeCategoryBudget, rowsByCategoryBudget]);

  const removedPersistedItemIds = useMemo(() => {
    if (!activeCategoryBudget?.id) return [];

    return (
      removedPersistedItemIdsByCategoryBudget[
        String(activeCategoryBudget.id)
      ] || []
    );
  }, [activeCategoryBudget, removedPersistedItemIdsByCategoryBudget]);

  const setRows = useCallback(
    (updater) => {
      if (!activeCategoryBudget?.id) return;

      setRowsByCategoryBudget((prev) => {
        const key = String(activeCategoryBudget.id);
        const currentRows = prev[key] || [];
        const nextRows =
          typeof updater === "function" ? updater(currentRows) : updater;

        return {
          ...prev,
          [key]: lockRowsToCategory(nextRows, activeCategoryBudget.category_id),
        };
      });
    },
    [activeCategoryBudget],
  );

  const importRowsToCategoryBudgets = useCallback(
    (importedRows) => {
      if (!Array.isArray(importedRows) || importedRows.length === 0) return;

      const budgetByCategoryId = new Map(
        categoryBudgets.map((categoryBudget) => [
          Number(categoryBudget.category_id),
          categoryBudget,
        ]),
      );

      setRowsByCategoryBudget((prev) => {
        const next = { ...prev };

        for (const row of importedRows) {
          const categoryBudget = budgetByCategoryId.get(Number(row.category));

          if (!categoryBudget || categoryBudget.status !== "DRAFT") continue;

          const key = String(categoryBudget.id);
          next[key] = lockRowsToCategory(
            [...(next[key] || []), row],
            categoryBudget.category_id,
          );
        }

        return next;
      });
    },
    [categoryBudgets],
  );

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
            name: item.category_name,
            is_active: true,
          });
        }
      }

      return merged;
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
            loading: "Loading department budget setup...",
            success: "Department budget setup loaded",
            error: "Failed to load department budget setup data",
          },
        );

        if (ignore) return;

        const budget = budgetResult?.budget || budgetResult;
        const budgetCategories = budget?.categories || [];

        setCurrentBudget(budget);
        setOpenYear(yearResult);
        setCategories(categoryResult);
        setCategoryBudgets(budgetCategories);
        setActiveCategoryBudgetId(
          (current) => current || budgetCategories[0]?.id || null,
        );

        const mappedRows = mapRowsByCategoryBudget(budgetCategories);
        setRemovedPersistedItemIdsByCategoryBudget({});

        for (const categoryBudget of budgetCategories) {
          const draftKey = getBudgetDraftKey(categoryBudget.id);
          const budgetStatus = categoryBudget.status || "DRAFT";

          if (
            [
              "IN_CATEGORY_REVIEW",
              "CATEGORY_REVIEW_COMPLETED",
            ].includes(budgetStatus)
          ) {
            localStorage.removeItem(draftKey);
            continue;
          }

          const localRows = getRowsFromLocalStorage(draftKey);
          if (localRows) {
            mappedRows[String(categoryBudget.id)] = lockRowsToCategory(
              localRows,
              categoryBudget.category_id,
            );
          }
        }

        setRowsByCategoryBudget(mappedRows);

        const allItems = budgetCategories.flatMap(
          (categoryBudget) => categoryBudget.items || [],
        );
        mergeExistingBudgetCategories(allItems);
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

    for (const categoryBudget of categoryBudgets) {
      const budgetStatus = categoryBudget.status || "DRAFT";
      const budgetDraftKey = getBudgetDraftKey(categoryBudget.id);

      if (
        ["IN_CATEGORY_REVIEW", "CATEGORY_REVIEW_COMPLETED"].includes(
          budgetStatus,
        )
      ) {
        localStorage.removeItem(budgetDraftKey);
        continue;
      }

      localStorage.setItem(
        budgetDraftKey,
        JSON.stringify(
          lockRowsToCategory(
            rowsByCategoryBudget[String(categoryBudget.id)] || [],
            categoryBudget.category_id,
          ),
        ),
      );
    }
  }, [rowsByCategoryBudget, loadingSetup, categoryBudgets]);

  useEffect(() => {
    const categoryIds = [
      ...new Set(
        categoryBudgets
          .map((categoryBudget) => String(categoryBudget.category_id))
          .filter(Boolean),
      ),
    ];

    const missingIds = categoryIds.filter(
      (categoryId) =>
        !Object.prototype.hasOwnProperty.call(typesByCategory, categoryId),
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
      loading: "Loading catalog items...",
      success: "Catalog items loaded",
      error: "Failed to load catalog items",
    });

    return () => {
      ignore = true;
    };
  }, [categoryBudgets, typesByCategory]);

  const updateRow = useCallback(
    (id, field, value) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;

          if (field === "category") return row;

          const normalizedValue =
            field === "item"
              ? value === null || value === ""
                ? null
                : Number(value)
              : value;

          const next = {
            ...row,
            [field]: normalizedValue,
          };

          const nextSnapshot = getRowSnapshot(next);

          return {
            ...next,
            isSaved: row.savedSnapshot === nextSnapshot,
          };
        }),
      );
    },
    [setRows],
  );

  const addItem = useCallback(() => {
    if (!activeCategoryBudget) return;
    if (activeCategoryBudget.status !== "DRAFT") return;

    setRows((prev) => [
      createRow(
        `new-${Date.now()}`,
        activeCategoryBudget.category_id,
        null,
        "MONTHLY",
        0,
      ),
      ...prev,
    ]);
  }, [activeCategoryBudget, setRows]);

  const deleteItem = useCallback(
    async (id) => {
      const rowToDelete = rows.find((row) => row.id === id);
      if (!rowToDelete) return;
      if (activeCategoryBudget?.status !== "DRAFT") {
        throw new Error(
          "Submitted category budgets are read-only.",
        );
      }

      if (!rowToDelete.isNew && activeCategoryBudget?.id) {
        setRemovedPersistedItemIdsByCategoryBudget((prev) => {
          const key = String(activeCategoryBudget.id);
          const current = prev[key] || [];
          const rowId = Number(rowToDelete.id);

          if (current.includes(rowId)) return prev;

          return {
            ...prev,
            [key]: [...current, rowId],
          };
        });
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
    },
    [activeCategoryBudget, rows, setRows],
  );

  const refreshBudget = useCallback(async () => {
    if (!currentBudget?.id) return;

    const current = await getCurrentBudget();
    const budget = current?.budget || current;

    const budgetCategories = budget?.categories || [];
    setCurrentBudget(budget);
    setCategoryBudgets(budgetCategories);
    setRowsByCategoryBudget(mapRowsByCategoryBudget(budgetCategories));
    setRemovedPersistedItemIdsByCategoryBudget({});
  }, [currentBudget]);

  const saveDraft = useCallback(
    async (payloadRows) => {
      setSaving(true);

      try {
        const categoryBudgetId = activeCategoryBudget?.id;

        if (!categoryBudgetId) {
          throw new Error("Current category budget was not loaded");
        }

        const savedBudget = await toastPromise(
          replaceBudgetItems(categoryBudgetId, payloadRows),
          {
            loading: "Saving category draft...",
            success: "Category draft saved successfully",
            error: "Failed to save category budget",
          },
        );

        const budget = savedBudget || (await getCurrentBudget()).budget;
        const budgetCategories = budget?.categories || [];

        setCurrentBudget(budget);
        setCategoryBudgets(budgetCategories);
        setRowsByCategoryBudget(mapRowsByCategoryBudget(budgetCategories));
        setRemovedPersistedItemIdsByCategoryBudget((prev) => {
          const next = { ...prev };
          delete next[String(categoryBudgetId)];
          return next;
        });
        localStorage.removeItem(getBudgetDraftKey(categoryBudgetId));
      } finally {
        setSaving(false);
      }
    },
    [activeCategoryBudget],
  );

  return {
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
    removedPersistedItemIds,
    importRowsToCategoryBudgets,
    updateRow,
    addItem,
    deleteItem,
    saveDraft,
    refreshBudget,
  };
}
