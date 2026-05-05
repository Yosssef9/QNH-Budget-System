import { useEffect, useState } from "react";
import {
  createBudgetItem,
  getBudgetItems,
  getCategories,
  getCurrentBudget,
  getTypesByCategory,
} from "../../api/budget.api";
import { getOpenFinancialYear } from "../../api/financialYears.api";
import { toastPromise } from "../../helpers/toast.helper";
import { createRow, mapBudgetItemToRow } from "../../helpers/budgetRows.helper";
const LOCAL_DRAFT_KEY = "create_budget_manual_draft_rows";

export function useCreateBudgetManual() {
  const [currentBudget, setCurrentBudget] = useState(null);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [typesByCategory, setTypesByCategory] = useState({});
  const [openYear, setOpenYear] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadSetup() {
      try {
        const [budgetResult, yearResult, categoryResult] = await toastPromise(
          Promise.all([
            getCurrentBudget(),
            getOpenFinancialYear(),
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

        const savedLocalRows = localStorage.getItem(LOCAL_DRAFT_KEY);

        if (savedLocalRows) {
          try {
            setRows(JSON.parse(savedLocalRows));
          } catch {
            localStorage.removeItem(LOCAL_DRAFT_KEY);
          }
        } else if (budgetItems.length > 0) {
          setRows(budgetItems.map(mapBudgetItemToRow));
        } else if (categoryResult.length > 0) {
          setRows([
            createRow(Date.now(), categoryResult[0].id, "", "MONTHLY", 0, 0),
          ]);
        }
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

    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(rows));
  }, [rows, loadingSetup]);
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

  function updateRow(id, field, value) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, [field]: value };

        if (field === "category") {
          next.item = "";
        }

        return next;
      }),
    );
  }

  function addItem() {
    setRows((prev) => [
      createRow(Date.now(), categories[0]?.id || "", "", "MONTHLY", 0, 0),
      ...prev,
    ]);
  }

  function deleteItem(id) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  async function saveDraft(payloadRows) {
    setSaving(true);

    try {
      const budgetId = currentBudget?.id;

      if (!budgetId) {
        throw new Error("Current draft budget was not loaded");
      }

      await toastPromise(
        Promise.all(
          payloadRows.map((payload) => createBudgetItem(budgetId, payload)),
        ),
        {
          loading: "Saving budget draft...",
          success: "Budget draft saved successfully",
          error: "Failed to save budget",
        },
      );
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    } finally {
      setSaving(false);
    }
  }

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
