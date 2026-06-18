import api from "./api";

export async function getPOItemMappings(params = {}) {
  const { data } = await api.get("/admin/po-item-mappings", {
    params,
  });

  return data.data || [];
}

export async function createPOItemMapping(payload) {
  const { data } = await api.post("/admin/po-item-mappings", payload);

  return data.data;
}

export async function updatePOItemMappingStatus(id, payload) {
  const { data } = await api.patch(
    `/admin/po-item-mappings/${id}/status`,
    payload,
  );

  return data.data;
}

export async function searchPOItemMappingBudgetTypes(params = {}) {
  const { data } = await api.get("/admin/po-item-mappings/budget-types", {
    params,
  });

  return data.data || [];
}

export async function searchPOItemsForMapping(params = {}) {
  const { data } = await api.get("/admin/po-item-mappings/po-items", {
    params,
  });

  return data.data || [];
}
