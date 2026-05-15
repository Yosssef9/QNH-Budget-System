import api from "./api";

export async function getSetupCategories() {
  const response = await api.get("/categories");
  return response.data?.data || [];
}

export async function createSetupCategory(payload) {
  const response = await api.post("/categories", payload);
  return response.data?.data;
}

export async function getSetupTypesByCategory(categoryId) {
  if (!categoryId) return [];

  const response = await api.get(`/categories/${categoryId}/types`);
  return response.data?.data || [];
}

export async function createSetupType({ categoryId, payload }) {
  const response = await api.post(`/categories/${categoryId}/types`, payload);
  return response.data?.data;
}

export async function getItemRequests(status = "PENDING") {
  const response = await api.get("/item-requests", {
    params: { status },
  });

  return response.data?.data || [];
}

export async function approveItemRequest({ requestId, adminNote }) {
  const response = await api.post(`/item-requests/${requestId}/approve`, {
    adminNote,
  });

  return response.data?.data;
}

export async function rejectItemRequest({ requestId, adminNote }) {
  const response = await api.post(`/item-requests/${requestId}/reject`, {
    adminNote,
  });

  return response.data?.data;
}

export async function updateSetupCategory({ categoryId, payload }) {
  const response = await api.patch(`/categories/${categoryId}`, payload);
  return response.data?.data;
}

export async function updateSetupType({ categoryId, typeId, payload }) {
  const response = await api.patch(
    `/categories/${categoryId}/types/${typeId}`,
    payload,
  );

  return response.data?.data;
}

export async function getSetupCategoryUsage(categoryId) {
  const response = await api.get(`/categories/${categoryId}/usage`);
  return response.data?.data || [];
}

export async function getSetupTypeUsage({ categoryId, typeId }) {
  const response = await api.get(
    `/categories/${categoryId}/types/${typeId}/usage`,
  );
  return response.data?.data || [];
}

export async function deleteSetupCategory(categoryId) {
  const response = await api.delete(`/categories/${categoryId}`);
  return response.data?.data;
}

export async function deleteSetupType({ categoryId, typeId }) {
  const response = await api.delete(
    `/categories/${categoryId}/types/${typeId}`,
  );
  return response.data?.data;
}
export async function createItemRequest(payload) {
  const response = await api.post("/item-requests", payload);
  return response.data?.data;
}
export async function approveItemRequestManual({ requestId, adminNote }) {
  const response = await api.post(
    `/item-requests/${requestId}/approve-manual`,
    {
      adminNote,
    },
  );

  return response.data?.data;
}
