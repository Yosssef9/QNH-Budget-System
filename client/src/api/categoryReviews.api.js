import api from "./api";

export async function getCategoryReviews(params = {}) {
  const response = await api.get("/category-reviews", { params });
  return response.data?.data || [];
}

export async function getCategoryReviewDetails(reviewId) {
  const response = await api.get(`/category-reviews/${reviewId}`);
  return response.data?.data;
}

export async function submitCategoryReviewPackageToCfo({
  packageId,
  payload = {},
}) {
  const response = await api.patch(
    `/category-reviews/packages/${packageId}/submit-to-cfo`,
    payload,
  );
  return response.data?.data;
}

export async function updateDepartmentRequestItemReview({
  requestItemId,
  payload,
}) {
  const response = await api.patch(
    `/category-reviews/department-request-items/${requestItemId}/review`,
    payload,
  );
  return response.data?.data;
}

export async function returnDepartmentCategoryBudget({
  categoryBudgetId,
  payload,
}) {
  const response = await api.patch(
    `/category-reviews/department-category-budgets/${categoryBudgetId}/return`,
    payload,
  );
  return response.data?.data;
}

export async function updateApprovedQuantity({ reviewId, approvedQuantity }) {
  const response = await api.patch(
    `/category-reviews/${reviewId}/approved-quantity`,
    { approvedQuantity },
  );
  return response.data?.data;
}

export async function updateCategoryReviewStatus({ reviewId, payload }) {
  const response = await api.patch(
    `/category-reviews/${reviewId}/status`,
    payload,
  );
  return response.data?.data;
}

export async function getDepartmentRequestItemsForReview(
  reviewId,
  params = {},
) {
  const response = await api.get(
    `/category-reviews/${reviewId}/department-requests`,
    { params },
  );
  return response.data?.data || [];
}

export async function createReviewSubItem({ reviewId, payload }) {
  const response = await api.post(
    `/category-reviews/${reviewId}/sub-items`,
    payload,
  );
  return response.data?.data;
}

export async function updateReviewSubItem({ reviewId, lineId, payload }) {
  const response = await api.patch(
    `/category-reviews/${reviewId}/sub-items/${lineId}`,
    payload,
  );
  return response.data?.data;
}

export async function deleteReviewSubItem({ reviewId, lineId }) {
  const response = await api.delete(
    `/category-reviews/${reviewId}/sub-items/${lineId}`,
  );
  return response.data?.data;
}

export async function getReviewAttachments(reviewId) {
  const response = await api.get(`/category-reviews/${reviewId}/attachments`);
  return response.data?.data || [];
}

export async function uploadReviewAttachment({ reviewId, formData }) {
  const response = await api.post(
    `/category-reviews/${reviewId}/attachments`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data?.data;
}

export async function downloadReviewAttachment({ reviewId, attachmentId }) {
  const response = await api.get(
    `/category-reviews/${reviewId}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  );
  return response.data;
}

export async function deleteReviewAttachment({ reviewId, attachmentId }) {
  const response = await api.delete(
    `/category-reviews/${reviewId}/attachments/${attachmentId}`,
  );
  return response.data?.data;
}

export async function getReviewSubItemAttachments({ reviewId, lineId }) {
  const response = await api.get(
    `/category-reviews/${reviewId}/sub-items/${lineId}/attachments`,
  );
  return response.data?.data || [];
}

export async function uploadReviewSubItemAttachment({
  reviewId,
  lineId,
  formData,
}) {
  const response = await api.post(
    `/category-reviews/${reviewId}/sub-items/${lineId}/attachments`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data?.data;
}

export async function downloadReviewSubItemAttachment({
  reviewId,
  lineId,
  attachmentId,
}) {
  const response = await api.get(
    `/category-reviews/${reviewId}/sub-items/${lineId}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  );
  return response.data;
}

export async function deleteReviewSubItemAttachment({
  reviewId,
  lineId,
  attachmentId,
}) {
  const response = await api.delete(
    `/category-reviews/${reviewId}/sub-items/${lineId}/attachments/${attachmentId}`,
  );
  return response.data?.data;
}
