import api from "./api";

export async function getCurrentBudget() {
  const response = await api.get("/budgets/current");
  return response.data?.budget;
}
export async function getMyBudgets() {
  const response = await api.get("/budgets/my");
  return response.data?.data || [];
}

export async function createBudget(payload = {}) {
  const response = await api.post("/budgets", payload);
  return response.data?.data;
}

export async function createBudgetItem(budgetId, payload) {
  const response = await api.post(`/budgets/${budgetId}/items`, payload);
  return response.data?.data;
}

export async function getCategories() {
  const response = await api.get("/categories");
  return response.data?.data || [];
}

export async function getTypesByCategory(categoryId) {
  if (!categoryId) return [];

  const response = await api.get(`/categories/${categoryId}/types`);
  return response.data?.data || [];
}

export async function getBudgetItems(budgetId) {
  const response = await api.get(`/budgets/${budgetId}/items`);
  return response.data?.items || [];
}

export async function deleteBudgetItem(budgetId, itemId) {
  const response = await api.delete(`/budgets/${budgetId}/items/${itemId}`);
  return response.data;
}

export async function replaceBudgetItems(budgetId, items) {
  const response = await api.put(`/budgets/${budgetId}/items`, {
    items,
  });

  return response.data?.data;
}

export async function submitBudget(budgetId) {
  const response = await api.patch(`/budgets/${budgetId}/submit`);
  return response.data?.data;
}

export async function getPendingApprovals() {
  const response = await api.get("/budget-approval/pending");
  return response.data?.data || [];
}

export async function getBudgetReview(budgetId) {
  const response = await api.get(`/budget-approval/${budgetId}`);
  return response.data?.data;
}

export async function approveBudget(budgetId, payload) {
  const response = await api.patch(
    `/budget-approval/${budgetId}/approve`,
    payload,
  );
  return response.data?.data;
}

export async function returnBudget(budgetId, payload) {
  const response = await api.patch(
    `/budget-approval/${budgetId}/return`,
    payload,
  );
  return response.data?.data;
}

export async function getBudgetReviewFeedback(budgetId) {
  const response = await api.get(`/budgets/${budgetId}/review-feedback`);
  return response.data?.data || { generalNotes: [], itemNotes: [] };
}
export async function getBudgetComparison() {
  const response = await api.get("/budget-approval/comparison");
  return response.data?.data || [];
}
export async function getApprovedApprovals() {
  const response = await api.get("/budget-approval/approved");
  return response.data?.data || [];
}
export async function getDashboardStats() {
  const response = await api.get("/dashboard/stats");
  return response.data?.data;
}
export async function getAuditLogs(params = {}) {
  const response = await api.get("/audit-logs", { params });
  return response.data?.data;
}
export async function getDashboardItemRequests() {
  const response = await api.get("/item-requests/dashboard");
  return response.data?.data || { mode: null, requests: [] };
}
export async function getAuditLogUsers() {
  const response = await api.get("/audit-logs/users");
  return response.data?.data || [];
}
export async function getBudgetTimeline(budgetId) {
  const response = await api.get(`/budgets/${budgetId}/timeline`);

  return response.data?.data || [];
}
export async function getBudgetDetails(budgetId) {
  const response = await api.get(`/budgets/${budgetId}`);

  return response.data?.data;
}
export async function getBudgetBalanceSummary(budgetId) {
  const response = await api.get(`/budgets/${budgetId}/balance-summary`);

  return response.data?.data || [];
}
export async function getAvailableTransferTypes() {
  const response = await api.get("/budget-items/available-transfer-types");

  return response.data?.data || [];
}
export async function getAllBudgetTypes() {
  const response = await api.get("/categories/types/all");

  return response.data?.data || [];
}
export async function getApprovedBudgetHistory() {
  const response = await api.get("/budgets/history/approved");

  return response.data?.data || [];
}

export async function getBudgetHistoryItems(budgetId) {
  const response = await api.get(`/budgets/history/${budgetId}/items`);

  return response.data?.data || [];
}
