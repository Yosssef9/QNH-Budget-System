import api from "./api";

export async function getProjects(params = {}) {
  const response = await api.get("/projects", { params });
  return response.data?.data || [];
}

export async function getProjectFilterOptions() {
  const response = await api.get("/projects/filter-options");
  return response.data?.data || {
    financialYears: [],
    departments: [],
    budgets: [],
  };
}

export async function getProjectDetails(budgetItemId) {
  const response = await api.get(`/projects/${budgetItemId}`);
  return response.data?.data || null;
}
