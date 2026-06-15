import api from "./api";

export async function getAvailablePOs(params = {}) {
  const { data } = await api.get("/po-links/available-pos", {
    params,
  });

  return data.data || [];
}

export async function getMyPOLinks() {
  const { data } = await api.get("/po-links/my");

  return data.data || [];
}

export async function getPODashboard() {
  const { data } = await api.get("/po-links/dashboard");

  return data.data || { mode: null, requests: [] };
}

export async function getPOBudgetItems() {
  const { data } = await api.get("/po-links/budget-items");

  return data.data || [];
}

export async function getPOLinksForApproval(params = {}) {
  const { data } = await api.get("/po-links", {
    params,
  });

  return data.data || [];
}

export async function getPendingPOLinks(params = {}) {
  return getPOLinksForApproval({
    status: "PENDING",
    ...params,
  });
}

export async function getPOLinkById(id) {
  const { data } = await api.get(`/po-links/${id}`);

  return data.data;
}

export async function getPOTransparency(purchaseInvoiceLineId) {
  const { data } = await api.get(
    `/po-links/po/${purchaseInvoiceLineId}/transparency`,
  );

  return data.data;
}

export async function createPOLink(payload) {
  const { data } = await api.post("/po-links", payload);

  return data.data;
}

export async function approvePOLink(id) {
  const { data } = await api.post(`/po-links/${id}/approve`);

  return data.data;
}

export async function rejectPOLink(id, reason) {
  const { data } = await api.post(`/po-links/${id}/reject`, { reason });

  return data.data;
}
