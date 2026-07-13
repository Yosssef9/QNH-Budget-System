import api from "./api";

export async function getCategoryReviewQueue() {
  const response = await api.get("/category-review/queue");
  return response.data?.data || {
    summary: {},
    submissionWindow: null,
    budgets: [],
  };
}

export async function getCategoryReviewBudget(departmentCategoryBudgetId) {
  if (!departmentCategoryBudgetId) return null;
  const response = await api.get(
    `/category-review/budgets/${departmentCategoryBudgetId}`,
  );
  return response.data?.data;
}

export async function getCategorySubmissionWindow() {
  const response = await api.get("/category-review/submission-window");
  return response.data?.data;
}

export async function closeCategorySubmissionWindow({ closeReason = "" } = {}) {
  const response = await api.patch("/category-review/submission-window/close", {
    close_reason: closeReason,
  });
  return response.data?.data;
}

export async function reopenCategorySubmissionWindow({ reopenReason }) {
  const response = await api.patch("/category-review/submission-window/reopen", {
    reopen_reason: reopenReason,
  });
  return response.data?.data;
}

export async function saveCategoryReviewItemDecision({ itemId, payload }) {
  const response = await api.patch(
    `/category-review/items/${itemId}/decision`,
    payload,
  );
  return response.data?.data;
}

export async function completeDepartmentCategoryReview(
  departmentCategoryBudgetId,
) {
  const response = await api.patch(
    `/category-review/budgets/${departmentCategoryBudgetId}/complete`,
  );
  return response.data?.data;
}
export async function reopenDepartmentCategoryReview({
  departmentCategoryBudgetId,
  rowVersion,
}) {
  const response = await api.patch(
    `/category-review/budgets/${departmentCategoryBudgetId}/reopen`,
    {
      row_version: rowVersion,
    },
  );

  return response.data?.data;
}