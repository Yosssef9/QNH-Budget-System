import api from "./api";

export async function getMyBudgets() {
  const response = await api.get("/budgets/my");
  return response.data?.data || [];
}
