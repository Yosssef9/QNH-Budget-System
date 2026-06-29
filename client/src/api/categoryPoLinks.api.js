import api from "./api";

export async function getAvailableCategoryPOs(params = {}) {
  const response = await api.get("/category-po-links/available-pos", {
    params,
  });
  return response.data?.data || [];
}

export async function getEligibleCategoryPoSubItems(params = {}) {
  const response = await api.get("/category-po-links/eligible-sub-items", {
    params,
  });
  return response.data?.data || [];
}

export async function getCategoryPOSuggestions(params = {}) {
  const response = await api.get("/category-po-links/suggestions", {
    params,
  });
  return response.data?.data || [];
}

export async function getMyCategoryPoLinks(params = {}) {
  const response = await api.get("/category-po-links/my", { params });
  return response.data?.data || [];
}

export async function getCategoryPoLinksForApproval(params = {}) {
  const response = await api.get("/category-po-links/pending", { params });
  return response.data?.data || [];
}

export async function getCategoryPoLinkById(poLinkId) {
  const response = await api.get(`/category-po-links/${poLinkId}`);
  return response.data?.data;
}

export async function createCategoryPoLink(payload) {
  const response = await api.post("/category-po-links", payload);
  return response.data?.data;
}

export async function approveCategoryPoLink({ poLinkId, payload = {} }) {
  const response = await api.patch(
    `/category-po-links/${poLinkId}/approve`,
    payload,
  );
  return response.data?.data;
}

export async function rejectCategoryPoLink({ poLinkId, payload }) {
  const response = await api.patch(
    `/category-po-links/${poLinkId}/reject`,
    payload,
  );
  return response.data?.data;
}
