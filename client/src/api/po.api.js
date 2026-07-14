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

export async function getPOSuggestions(budgetItemId) {
  const { data } = await api.get("/po-links/suggestions", {
    params: { budgetItemId },
  });

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

export async function getPackageSubItemPOLinks(packageSubItemId) {
  const { data } = await api.get(
    `/po-links/package-sub-items/${packageSubItemId}/links`,
  );

  return (
    data.data || {
      packageSubItem: null,
      summary: {
        approvedLinkCount: 0,
        pendingLinkCount: 0,
        totalPOUsed: 0,
        totalPendingPOAmount: 0,
        totalLinkedQuantity: 0,
        totalPendingQuantity: 0,
      },
      links: [],
    }
  );
}

export async function getPackageSubItemPriceIntelligence(packageSubItemId) {
  const { data } = await api.get(
    `/po-links/package-sub-items/${packageSubItemId}/price-intelligence`,
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
