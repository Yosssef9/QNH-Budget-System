import api from "./api";

export async function getBudgetAccessDepartments() {
  const response = await api.get("/admin/budget-access/departments");
  return response.data;
}
