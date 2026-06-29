import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveCategoryPoLink,
  createCategoryPoLink,
  getAvailableCategoryPOs,
  getCategoryPoLinkById,
  getCategoryPoLinksForApproval,
  getCategoryPOSuggestions,
  getEligibleCategoryPoSubItems,
  getMyCategoryPoLinks,
  rejectCategoryPoLink,
} from "../../api/categoryPoLinks.api";

export const CATEGORY_PO_LINKS_QUERY_KEY = ["category-po-links"];

export function useAvailableCategoryPOs(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_PO_LINKS_QUERY_KEY, "available-pos", params],
    queryFn: () => getAvailableCategoryPOs(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useEligibleCategoryPoSubItems(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_PO_LINKS_QUERY_KEY, "eligible-sub-items", params],
    queryFn: () => getEligibleCategoryPoSubItems(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCategoryPOSuggestions(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_PO_LINKS_QUERY_KEY, "suggestions", params],
    queryFn: () => getCategoryPOSuggestions(params),
    enabled: Boolean(params?.lineId),
    placeholderData: (previousData) => previousData,
  });
}

export function useMyCategoryPoLinks(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_PO_LINKS_QUERY_KEY, "my", params],
    queryFn: () => getMyCategoryPoLinks(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCategoryPoLinksForApproval(params = {}) {
  return useQuery({
    queryKey: [...CATEGORY_PO_LINKS_QUERY_KEY, "approval", params],
    queryFn: () => getCategoryPoLinksForApproval(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCategoryPoLinkDetails(poLinkId) {
  return useQuery({
    queryKey: [...CATEGORY_PO_LINKS_QUERY_KEY, "details", poLinkId],
    queryFn: () => getCategoryPoLinkById(poLinkId),
    enabled: Boolean(poLinkId),
  });
}

export function useCreateCategoryPoLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategoryPoLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_PO_LINKS_QUERY_KEY });
    },
  });
}

export function useApproveCategoryPoLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveCategoryPoLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_PO_LINKS_QUERY_KEY });
    },
  });
}

export function useRejectCategoryPoLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectCategoryPoLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_PO_LINKS_QUERY_KEY });
    },
  });
}
