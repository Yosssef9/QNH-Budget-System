import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveCfoReviewPackage,
  getCfoReviewPackageDetails,
  getCfoReviewPackages,
  returnCfoReviewPackage,
  updateCfoReviewItemStatus,
} from "../../api/cfoReviews.api";

export const CFO_REVIEWS_QUERY_KEY = ["cfo-reviews"];

export function useCfoReviewPackages(params = {}) {
  return useQuery({
    queryKey: [...CFO_REVIEWS_QUERY_KEY, "packages", params],
    queryFn: () => getCfoReviewPackages(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCfoReviewPackageDetails(packageId) {
  return useQuery({
    queryKey: [...CFO_REVIEWS_QUERY_KEY, "package-details", packageId],
    queryFn: () => getCfoReviewPackageDetails(packageId),
    enabled: Boolean(packageId),
  });
}

export function useUpdateCfoReviewItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCfoReviewItemStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CFO_REVIEWS_QUERY_KEY });
    },
  });
}

export function useApproveCfoReviewPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveCfoReviewPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CFO_REVIEWS_QUERY_KEY });
    },
  });
}

export function useReturnCfoReviewPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: returnCfoReviewPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CFO_REVIEWS_QUERY_KEY });
    },
  });
}
