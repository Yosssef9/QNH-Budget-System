import api from "./api";

export async function getCfoReviewPackages(params = {}) {
  const response = await api.get("/cfo-reviews", { params });
  return response.data?.data || [];
}

export async function getCfoReviewPackageDetails(packageId) {
  const response = await api.get(`/cfo-reviews/${packageId}`);
  return response.data?.data;
}

export async function updateCfoReviewItemStatus({
  packageId,
  reviewId,
  payload,
}) {
  const response = await api.patch(
    `/cfo-reviews/${packageId}/items/${reviewId}/status`,
    payload,
  );
  return response.data?.data;
}

export async function approveCfoReviewPackage({ packageId, payload = {} }) {
  const response = await api.patch(
    `/cfo-reviews/${packageId}/approve`,
    payload,
  );
  return response.data?.data;
}

export async function returnCfoReviewPackage({ packageId, payload }) {
  const response = await api.patch(
    `/cfo-reviews/${packageId}/return`,
    payload,
  );
  return response.data?.data;
}
