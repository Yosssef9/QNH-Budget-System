import api from "./api";

export async function getPurchasingFinancialYears() {
  const response = await api.get("/purchasing-price-review/financial-years");
  return response.data?.data || [];
}

export async function getPurchasingPackages({ financialYearId, priceStatus } = {}) {
  const response = await api.get("/purchasing-price-review/packages", {
    params: {
      financialYearId: financialYearId || undefined,
      priceStatus: priceStatus === "ALL" ? undefined : priceStatus,
    },
  });
  return response.data?.data || [];
}

export async function getPurchasingPackage(packageId) {
  if (!packageId) return null;
  const response = await api.get(`/purchasing-price-review/packages/${packageId}`);
  return response.data?.data;
}

export async function savePurchasingPrice({
  packageId,
  packageSubItemId,
  payload,
}) {
  const response = await api.patch(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/price`,
    payload,
  );
  return response.data?.data;
}

export async function acceptPurchasingPrice({ packageId, packageSubItemId, payload }) {
  const response = await api.patch(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/accept`,
    payload,
  );
  return response.data?.data;
}

export async function reopenPurchasingPrice({ packageId, packageSubItemId, payload }) {
  const response = await api.patch(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/reopen`,
    payload,
  );
  return response.data?.data;
}

export async function acceptAllPurchasingPrices({ packageId, payload }) {
  const response = await api.patch(
    `/purchasing-price-review/packages/${packageId}/accept-all`,
    payload,
  );
  return response.data?.data;
}

export async function submitPurchasingPackageToCfo({ packageId, payload }) {
  const response = await api.patch(
    `/purchasing-price-review/packages/${packageId}/submit-to-cfo`,
    payload,
  );
  return response.data?.data;
}

export async function getPurchasingPriceHistory({ packageId, packageSubItemId }) {
  const response = await api.get(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/history`,
  );
  return response.data?.data || [];
}

export async function getPurchasingAttachments({ packageId, packageSubItemId }) {
  const response = await api.get(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/attachments`,
  );
  return response.data?.data || [];
}

export async function uploadPurchasingAttachment({
  packageId,
  packageSubItemId,
  file,
  description,
  onUploadProgress,
}) {
  const formData = new FormData();
  formData.append("file", file);
  if (description) formData.append("description", description);
  const response = await api.post(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/attachments`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    },
  );
  return response.data?.data;
}

export async function downloadPurchasingAttachment({
  packageId,
  packageSubItemId,
  attachmentId,
}) {
  return api.get(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  );
}

export async function deletePurchasingAttachment({
  packageId,
  packageSubItemId,
  attachmentId,
  payload,
}) {
  const response = await api.delete(
    `/purchasing-price-review/packages/${packageId}/sub-items/${packageSubItemId}/attachments/${attachmentId}`,
    { data: payload },
  );
  return response.data?.data;
}
