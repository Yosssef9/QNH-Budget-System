import api from "./api";

export async function getSetupCategories() {
  const response = await api.get("/master-catalog/categories");
  return response.data?.data || [];
}

export async function createSetupCategory(payload) {
  const response = await api.post("/master-catalog/categories", payload);
  return response.data?.data;
}

export async function getSetupTypesByCategory(categoryId, options = {}) {
  if (!categoryId) return [];

  const response = await api.get(
    `/master-catalog/categories/${categoryId}/catalog-items`,
    {
      params: {
        includeInactive: options.includeInactive ? "1" : undefined,
      },
    },
  );
  return response.data?.data || [];
}

export async function getSetupSubItemsByCatalogItem(catalogItemId) {
  if (!catalogItemId) return [];

  const response = await api.get(
    `/master-catalog/catalog-items/${catalogItemId}/sub-items`,
  );
  return response.data?.data || [];
}

export async function createSetupType({ categoryId, payload }) {
  const response = await api.post(
    `/master-catalog/categories/${categoryId}/catalog-items`,
    payload,
  );
  return response.data?.data;
}

export async function createSetupSubItem({ catalogItemId, payload }) {
  const response = await api.post(
    `/master-catalog/catalog-items/${catalogItemId}/sub-items`,
    payload,
  );
  return response.data?.data;
}

export async function updateSetupCategory({ categoryId, payload }) {
  const response = await api.patch(
    `/master-catalog/categories/${categoryId}`,
    payload,
  );
  return response.data?.data;
}

export async function updateSetupType({ typeId, payload }) {
  const response = await api.patch(
    `/master-catalog/catalog-items/${typeId}`,
    payload,
  );

  return response.data?.data;
}

export async function updateSetupSubItem({ subItemId, payload }) {
  const response = await api.patch(
    `/master-catalog/catalog-sub-items/${subItemId}`,
    payload,
  );

  return response.data?.data;
}

export async function getSetupCategoryUsage(categoryId) {
  const response = await api.get(
    `/master-catalog/categories/${categoryId}/usage`,
  );
  return response.data?.data || [];
}

export async function getSetupTypeUsage({ typeId }) {
  const response = await api.get(`/master-catalog/catalog-items/${typeId}/usage`);
  return response.data?.data || [];
}

export async function deleteSetupCategory(categoryId) {
  const response = await api.delete(`/master-catalog/categories/${categoryId}`);
  return response.data?.data;
}

export async function deleteSetupType({ typeId }) {
  const response = await api.patch(
    `/master-catalog/catalog-items/${typeId}/status`,
    { is_active: false },
  );
  return response.data?.data;
}

export async function updateSetupTypeStatus({ typeId, isActive }) {
  const response = await api.patch(
    `/master-catalog/catalog-items/${typeId}/status`,
    { is_active: Boolean(isActive) },
  );
  return response.data?.data;
}

export async function updateSetupSubItemStatus({ subItemId, isActive }) {
  const response = await api.patch(
    `/master-catalog/catalog-sub-items/${subItemId}/status`,
    { is_active: Boolean(isActive) },
  );
  return response.data?.data;
}
export async function getBudgetTypes() {
  const response = await api.get("/master-catalog/catalog-items");

  return response.data?.data || [];
}

export async function getSetupUnitsOfMeasure() {
  const response = await api.get("/master-catalog/units-of-measure");
  return response.data?.data || [];
}
