import api from "./api";

export async function getSystemHealthSummary() {
  const response = await api.get("/system-health/summary");
  return response.data?.data;
}
