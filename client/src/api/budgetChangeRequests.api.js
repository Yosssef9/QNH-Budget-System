import api from "./api";

export async function createBudgetChangeRequest(payload) {
  const response = await api.post("/budget-change-requests", payload);
  return response.data?.data;
}

export async function getMyBudgetChangeRequests(params = {}) {
  const response = await api.get("/budget-change-requests/my", { params });
  return response.data?.data || [];
}

export async function getCategoryBudgetChangeRequests(params = {}) {
  const response = await api.get("/budget-change-requests/category", {
    params,
  });
  return response.data?.data || [];
}

export async function getCfoBudgetChangeRequests(params = {}) {
  const response = await api.get("/budget-change-requests/cfo", { params });
  return response.data?.data || [];
}

export async function getBudgetChangeRequestDetails(requestId) {
  const response = await api.get(`/budget-change-requests/${requestId}`);
  return response.data?.data;
}

export async function decideCategoryBudgetChangeRequest({
  requestId,
  payload,
}) {
  const response = await api.patch(
    `/budget-change-requests/${requestId}/category-decision`,
    payload,
  );
  return response.data?.data;
}

export async function decideCfoBudgetChangeRequest({ requestId, payload }) {
  const response = await api.patch(
    `/budget-change-requests/${requestId}/cfo-decision`,
    payload,
  );
  return response.data?.data;
}

export async function applyBudgetChangeRequest({ requestId, payload = {} }) {
  const response = await api.patch(
    `/budget-change-requests/${requestId}/apply`,
    payload,
  );
  return response.data?.data;
}
