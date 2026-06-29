import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createReviewSubItem,
  deleteReviewAttachment,
  deleteReviewSubItem,
  deleteReviewSubItemAttachment,
  downloadReviewAttachment,
  downloadReviewSubItemAttachment,
  getCategoryReviewDetails,
  getCategoryReviews,
  getDepartmentRequestItemsForReview,
  getReviewAttachments,
  getReviewSubItemAttachments,
  returnDepartmentCategoryBudget,
  submitCategoryReviewPackageToCfo,
  updateApprovedQuantity,
  updateCategoryReviewStatus,
  updateDepartmentRequestItemReview,
  updateReviewSubItem,
  uploadReviewAttachment,
  uploadReviewSubItemAttachment,
} from "../../api/categoryReviews.api";

export const CATEGORY_REVIEWS_QUERY_KEY = ["category-reviews"];

export function useCategoryReviews(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_REVIEWS_QUERY_KEY, "list", params],
    queryFn: () => getCategoryReviews(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCategoryReviewDetails(reviewId) {
  return useQuery({
    queryKey: [...CATEGORY_REVIEWS_QUERY_KEY, "details", reviewId],
    queryFn: () => getCategoryReviewDetails(reviewId),
    enabled: Boolean(reviewId),
  });
}

export function useDepartmentRequestItemsForReview(reviewId, params = {}) {
  return useQuery({
    queryKey: [
      ...CATEGORY_REVIEWS_QUERY_KEY,
      "department-requests",
      reviewId,
      params,
    ],
    queryFn: () => getDepartmentRequestItemsForReview(reviewId, params),
    enabled: Boolean(reviewId),
    placeholderData: (previousData) => previousData,
  });
}

export function useReviewAttachments(reviewId) {
  return useQuery({
    queryKey: [...CATEGORY_REVIEWS_QUERY_KEY, "attachments", reviewId],
    queryFn: () => getReviewAttachments(reviewId),
    enabled: Boolean(reviewId),
  });
}

export function useReviewSubItemAttachments(reviewId, lineId) {
  return useQuery({
    queryKey: [
      ...CATEGORY_REVIEWS_QUERY_KEY,
      "sub-item-attachments",
      reviewId,
      lineId,
    ],
    queryFn: () => getReviewSubItemAttachments({ reviewId, lineId }),
    enabled: Boolean(reviewId && lineId),
  });
}

export function useSubmitCategoryReviewPackageToCfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitCategoryReviewPackageToCfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useUpdateDepartmentRequestItemReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDepartmentRequestItemReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useReturnDepartmentCategoryBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: returnDepartmentCategoryBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useUpdateApprovedQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateApprovedQuantity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useUpdateCategoryReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategoryReviewStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useCreateReviewSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReviewSubItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useUpdateReviewSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateReviewSubItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useDeleteReviewSubItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReviewSubItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useUploadReviewAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadReviewAttachment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...CATEGORY_REVIEWS_QUERY_KEY,
          "attachments",
          variables.reviewId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useDownloadReviewAttachment() {
  return useMutation({
    mutationFn: downloadReviewAttachment,
  });
}

export function useDeleteReviewAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReviewAttachment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...CATEGORY_REVIEWS_QUERY_KEY,
          "attachments",
          variables.reviewId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useUploadReviewSubItemAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadReviewSubItemAttachment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...CATEGORY_REVIEWS_QUERY_KEY,
          "sub-item-attachments",
          variables.reviewId,
          variables.lineId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}

export function useDownloadReviewSubItemAttachment() {
  return useMutation({
    mutationFn: downloadReviewSubItemAttachment,
  });
}

export function useDeleteReviewSubItemAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReviewSubItemAttachment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...CATEGORY_REVIEWS_QUERY_KEY,
          "sub-item-attachments",
          variables.reviewId,
          variables.lineId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_REVIEWS_QUERY_KEY });
    },
  });
}
