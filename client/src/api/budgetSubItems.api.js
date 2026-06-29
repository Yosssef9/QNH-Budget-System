import api from "./api";

export async function getBudgetSubItems(params = {}) {
  const response = await api.get("/budget-sub-items", { params });
  return response.data?.data || [];
}

export async function createBudgetSubItem(payload) {
  const response = await api.post("/budget-sub-items", payload);
  return response.data?.data;
}

export async function updateBudgetSubItem({ subItemId, payload }) {
  const response = await api.patch(`/budget-sub-items/${subItemId}`, payload);
  return response.data?.data;
}

export async function deactivateBudgetSubItem(subItemId) {
  const response = await api.delete(`/budget-sub-items/${subItemId}`);
  return response.data?.data;
}
