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
