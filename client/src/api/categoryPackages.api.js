import api from "./api";

export async function getCurrentCategoryPackage() {
  const response = await api.get("/category-packages/current");
  return response.data?.data;
}
export async function getCategoryPackageDepartments() {
  const response = await api.get("/category-packages/departments");

  return (
    response.data?.data || {
      summary: {
        department_count: 0,
        item_count: 0,
        requested_quantity: 0,
        approved_quantity: 0,
        allocated_quantity: 0,
        remaining_quantity: 0,
        issue_count: 0,
      },
      departments: [],
    }
  );
}
export async function getCategoryPackageReadiness() {
  const response = await api.get("/category-packages/readiness");
  return response.data?.data;
}

export async function getCategoryPackageDistribution({ packageItemId } = {}) {
  const response = await api.get("/category-packages/distribution", {
    params: packageItemId ? { packageItemId } : undefined,
  });
  return response.data?.data;
}

export async function getCategoryPackageItemDetail(packageItemId) {
  if (!packageItemId) return null;
  const response = await api.get(`/category-packages/items/${packageItemId}`);
  return response.data?.data;
}

export async function createPackageSubItem({ packageItemId, payload }) {
  const response = await api.post(
    `/category-packages/items/${packageItemId}/sub-items`,
    payload,
  );
  return response.data?.data;
}

export async function updatePackageSubItem({ packageSubItemId, payload }) {
  const response = await api.patch(
    `/category-packages/sub-items/${packageSubItemId}`,
    payload,
  );
  return response.data?.data;
}

export async function getPackageSubItemAttachments(packageSubItemId) {
  const response = await api.get(
    `/category-packages/sub-items/${packageSubItemId}/attachments`,
  );
  return response.data?.data || [];
}

export async function uploadPackageSubItemAttachment({
  packageSubItemId,
  file,
  payload = {},
  onUploadProgress,
}) {
  const formData = new FormData();
  formData.append("file", file);

  if (payload.document_type) {
    formData.append("document_type", payload.document_type);
  }

  if (payload.description) {
    formData.append("description", payload.description);
  }

  const response = await api.post(
    `/category-packages/sub-items/${packageSubItemId}/attachments`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    },
  );
  return response.data?.data;
}

export async function downloadPackageSubItemAttachment({
  packageSubItemId,
  attachmentId,
}) {
  const response = await api.get(
    `/category-packages/sub-items/${packageSubItemId}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  );
  return response;
}

export async function deletePackageSubItemAttachment({
  packageSubItemId,
  attachmentId,
  payload,
}) {
  const response = await api.delete(
    `/category-packages/sub-items/${packageSubItemId}/attachments/${attachmentId}`,
    { data: payload },
  );
  return response.data?.data;
}

export async function removePackageSubItem({ packageSubItemId, payload }) {
  const response = await api.delete(
    `/category-packages/sub-items/${packageSubItemId}`,
    { data: payload },
  );
  return response.data?.data;
}

export async function replaceDepartmentItemAllocations({
  departmentItemId,
  payload,
}) {
  const response = await api.put(
    `/category-packages/department-items/${departmentItemId}/allocations`,
    payload,
  );
  return response.data?.data;
}

export async function updateDepartmentItemApprovedQuantity({
  departmentItemId,
  payload,
}) {
  const response = await api.patch(
    `/category-packages/department-items/${departmentItemId}/approved-quantity`,
    payload,
  );
  return response.data?.data;
}

export async function submitCategoryPackageToCfo({ packageId, payload }) {
  const response = await api.patch(
    `/category-packages/${packageId}/submit-to-cfo`,
    payload,
  );
  return response.data?.data;
}
