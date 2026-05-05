import api from "./api";

export async function getFinancialYears() {
  const response = await api.get("/financial-years");
  return response.data?.data || [];
}

export async function getOpenFinancialYear() {
  const response = await api.get("/financial-years/open");
  return response.data?.data || null;
}

export async function createFinancialYear(payload) {
  const response = await api.post("/financial-years", payload);
  return response.data?.data;
}

export async function closeFinancialYear(id) {
  const response = await api.patch(`/financial-years/${id}/close`);
  return response.data?.data;
}
