import api from "./api";

export async function getCfoFinancialYears() {
  const response = await api.get("/cfo-package-review/financial-years");
  return response.data?.data || [];
}

export async function getCfoPackages(financialYearId) {
  const response = await api.get("/cfo-package-review/packages", {
    params: financialYearId ? { financialYearId } : undefined,
  });
  return response.data?.data || [];
}

export async function getCfoPackage(packageId) {
  if (!packageId) return null;
  const response = await api.get(`/cfo-package-review/packages/${packageId}`);
  return response.data?.data;
}

export async function getCfoPackageDistribution({ packageId, packageItemId }) {
  if (!packageId) return null;
  const response = await api.get(
    `/cfo-package-review/packages/${packageId}/distribution`,
    {
      params: packageItemId ? { packageItemId } : undefined,
    },
  );
  return response.data?.data;
}

export async function getCfoFinancialYearDistribution(financialYearId) {
  if (!financialYearId) return null;
  const response = await api.get(
    `/cfo-package-review/financial-years/${financialYearId}/distribution`,
  );
  return response.data?.data;
}

export async function getCfoPackageTimeline(packageId) {
  if (!packageId) return [];
  const response = await api.get(
    `/cfo-package-review/packages/${packageId}/timeline`,
  );
  return response.data?.data || [];
}

export async function getCfoPackageItemComparison({ packageId, packageItemId }) {
  if (!packageId || !packageItemId) return null;
  const response = await api.get(
    `/cfo-package-review/packages/${packageId}/items/${packageItemId}/comparison`,
  );
  return response.data?.data;
}

export async function getCfoPackageItemDetail({ packageId, packageItemId }) {
  if (!packageId || !packageItemId) return null;
  const response = await api.get(
    `/cfo-package-review/packages/${packageId}/items/${packageItemId}`,
  );
  return response.data?.data;
}

export async function setCfoPackageItemDecision({
  packageId,
  packageItemId,
  payload,
}) {
  const response = await api.patch(
    `/cfo-package-review/packages/${packageId}/items/${packageItemId}/decision`,
    payload,
  );
  return response.data?.data;
}

export async function markAllCfoPackageItemsNeedModification({
  packageId,
  payload,
}) {
  const response = await api.patch(
    `/cfo-package-review/packages/${packageId}/items/needs-modification`,
    payload,
  );
  return response.data?.data;
}

export async function returnCfoPackageToCategoryManager({
  packageId,
  payload,
}) {
  const response = await api.patch(
    `/cfo-package-review/packages/${packageId}/return`,
    payload,
  );
  return response.data?.data;
}

export async function completeCfoPackageReview({ packageId, payload }) {
  const response = await api.patch(
    `/cfo-package-review/packages/${packageId}/complete`,
    payload,
  );
  return response.data?.data;
}

export async function reopenCfoPackageReview({ packageId, payload }) {
  const response = await api.patch(
    `/cfo-package-review/packages/${packageId}/reopen`,
    payload,
  );
  return response.data?.data;
}

export async function finalizeAnnualCfoPackageReview({
  financialYearId,
  payload,
}) {
  const response = await api.patch(
    `/cfo-package-review/financial-years/${financialYearId}/finalize`,
    payload,
  );
  return response.data?.data;
}

export async function getCfoPackageSubItemAttachments(packageSubItemId) {
  if (!packageSubItemId) return [];
  const response = await api.get(
    `/cfo-package-review/sub-items/${packageSubItemId}/attachments`,
  );
  return response.data?.data || [];
}

export async function downloadCfoPackageSubItemAttachment({
  packageSubItemId,
  attachmentId,
}) {
  const response = await api.get(
    `/cfo-package-review/sub-items/${packageSubItemId}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  );

  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);

  return {
    blob: response.data,
    fileName: match?.[1] || "attachment",
  };
}
