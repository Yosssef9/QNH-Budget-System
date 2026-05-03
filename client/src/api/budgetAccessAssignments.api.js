import api from "./api";

export async function getBudgetAccessAssignments() {
  const response = await api.get("/admin/budget-access/assignments");
  return response.data;
}

export async function createBudgetAccessAssignment(payload) {
  const response = await api.post("/admin/budget-access/assignments", payload);
  return response.data;
}

export async function updateBudgetAccessAssignment(id, payload) {
  const response = await api.put(
    `/admin/budget-access/assignments/${id}`,
    payload,
  );
  return response.data;
}

export async function updateBudgetAccessAssignmentStatus(id, is_active) {
  const response = await api.patch(
    `/admin/budget-access/assignments/${id}/status`,
    { is_active },
  );

  return response.data;
}
