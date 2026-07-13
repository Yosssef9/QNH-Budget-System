import api from "./api";

export async function createTransfer(payload) {
  const { data } = await api.post("/transfers", payload);
  return data.data;
}

export async function approveTransfer(id) {
  const { data } = await api.post(`/transfers/${id}/approve`);
  return data.data;
}

export async function rejectTransfer(id, note) {
  const { data } = await api.post(`/transfers/${id}/reject`, { note });

  return data.data;
}

export async function getTransferItems() {
  const { data } = await api.get("/transfers/items");
  return data.data || [];
}

export async function getTransferCatalogItems() {
  const { data } = await api.get("/transfers/catalog-items");
  return data.data || [];
}

export async function getTransferCatalogSubItems(catalogItemId) {
  if (!catalogItemId) return [];
  const { data } = await api.get(`/transfers/catalog-items/${catalogItemId}/sub-items`);
  return data.data || [];
}

export async function getTransferById(id) {
  const { data } = await api.get(`/transfers/${id}`);
  return data.data;
}

export async function getMyTransfers(financialYearId = null) {
  const { data } = await api.get("/transfers/my", {
    params: financialYearId ? { financialYearId } : {},
  });

  return data.data || [];
}

export async function getTransfers(
  status = "PENDING_APPROVAL",
  financialYearId = null,
) {
  const params = {};

  if (status && status !== "ALL") {
    params.status = status;
  }

  if (financialYearId) {
    params.financialYearId = financialYearId;
  }

  const { data } = await api.get("/transfers", {
    params,
  });

  return data.data || [];
}

export async function getTransferDashboard() {
  const { data } = await api.get("/transfers/dashboard");

  return data.data;
}
