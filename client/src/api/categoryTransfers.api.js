import api from "./api";

export async function getEligibleCategoryTransferItems(params = {}) {
  const response = await api.get("/category-transfers/eligible-items", {
    params,
  });
  return response.data?.data || [];
}

export async function getMyCategoryTransfers(params = {}) {
  const response = await api.get("/category-transfers/my", { params });
  return response.data?.data || [];
}

export async function getPendingCategoryTransfers(params = {}) {
  const response = await api.get("/category-transfers/pending", { params });
  return response.data?.data || [];
}

export async function getCategoryTransferDetails(transferId) {
  const response = await api.get(`/category-transfers/${transferId}`);
  return response.data?.data;
}

export async function createCategoryTransfer(payload) {
  const response = await api.post("/category-transfers", payload);
  return response.data?.data;
}

export async function approveCategoryTransfer({ transferId, payload = {} }) {
  const response = await api.patch(
    `/category-transfers/${transferId}/approve`,
    payload,
  );
  return response.data?.data;
}

export async function rejectCategoryTransfer({ transferId, payload }) {
  const response = await api.patch(
    `/category-transfers/${transferId}/reject`,
    payload,
  );
  return response.data?.data;
}
