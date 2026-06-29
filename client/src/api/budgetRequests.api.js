import api from "./api";

export async function getCurrentBudgetRequest(params = {}) {
  const response = await api.get("/budget-requests/current", { params });
  return response.data?.data;
}

export async function getCategoryBudgetItems(categoryBudgetId) {
  const response = await api.get(
    `/budget-requests/categories/${categoryBudgetId}/items`,
  );
  return response.data?.data || [];
}

export async function createRequestItem({ categoryBudgetId, payload }) {
  const response = await api.post(
    `/budget-requests/categories/${categoryBudgetId}/items`,
    payload,
  );
  return response.data?.data;
}

export async function updateRequestItem({ requestItemId, payload }) {
  const response = await api.patch(
    `/budget-requests/items/${requestItemId}`,
    payload,
  );
  return response.data?.data;
}

export async function deleteRequestItem(requestItemId) {
  const response = await api.delete(`/budget-requests/items/${requestItemId}`);
  return response.data?.data;
}

export async function submitCategoryBudget({ categoryBudgetId, payload = {} }) {
  const response = await api.patch(
    `/budget-requests/categories/${categoryBudgetId}/submit`,
    payload,
  );
  return response.data?.data;
}
