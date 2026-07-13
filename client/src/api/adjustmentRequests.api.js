import api from "./api";

export async function getAdjustmentRequestOptions(departmentCategoryBudgetId) {
  const response = await api.get(
    `/adjustment-requests/department-category-budgets/${departmentCategoryBudgetId}/options`,
  );
  return response.data?.data;
}

export async function createAdjustmentRequest({
  departmentCategoryBudgetId,
  payload,
}) {
  const response = await api.post(
    `/adjustment-requests/department-category-budgets/${departmentCategoryBudgetId}`,
    payload,
  );
  return response.data?.data;
}

export async function getMyAdjustmentRequests(status = "ALL") {
  const response = await api.get("/adjustment-requests/my", {
    params: status && status !== "ALL" ? { status } : {},
  });
  return response.data?.data || [];
}

export async function getCategoryAdjustmentRequests(status = "ALL") {
  const response = await api.get("/adjustment-requests/category", {
    params: status && status !== "ALL" ? { status } : {},
  });
  return response.data?.data || [];
}

export async function approveAdjustmentRequest({ requestId, note }) {
  const response = await api.patch(`/adjustment-requests/${requestId}/approve`, {
    note,
  });
  return response.data?.data;
}

export async function rejectAdjustmentRequest({ requestId, note }) {
  const response = await api.patch(`/adjustment-requests/${requestId}/reject`, {
    note,
  });
  return response.data?.data;
}
