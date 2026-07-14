import api from "./api";

export async function getBudgetAnalyticsOverview(params = {}) {
  const response = await api.get("/budget-analytics/overview", { params });
  return response.data?.data;
}
