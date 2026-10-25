import api from "./api";

export async function getBudgetExclusions(financialYearId) {
  const response = await api.get("/budget-exclusions", { params: { financialYearId } });
  return response.data?.data || [];
}
