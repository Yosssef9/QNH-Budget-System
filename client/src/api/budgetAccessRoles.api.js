import api from "./api";

export async function getBudgetAccessRoles() {
  const response = await api.get("/admin/budget-access/roles");
  return response.data;
}
