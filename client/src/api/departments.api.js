import api from "./api";

export async function getDepartments(params = {}) {
  const response = await api.get("/departments", { params });
  return response.data?.data || [];
}

export async function createDepartment(payload) {
  const response = await api.post("/departments", payload);
  return response.data?.data;
}

export async function updateDepartmentDescription(departmentId, payload) {
  const response = await api.patch(
    `/departments/${departmentId}/description`,
    payload,
  );
  return response.data?.data;
}

export async function updateDepartmentStatus(departmentId, isActive) {
  const response = await api.patch(`/departments/${departmentId}/status`, {
    is_active: isActive,
  });
  return response.data?.data;
}
