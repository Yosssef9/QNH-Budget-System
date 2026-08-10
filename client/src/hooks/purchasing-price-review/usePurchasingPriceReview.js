import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptAllPurchasingPrices,
  acceptPurchasingPrice,
  deletePurchasingAttachment,
  downloadPurchasingAttachment,
  getPurchasingAttachments,
  getPurchasingFinancialYears,
  getPurchasingPackage,
  getPurchasingPackages,
  getPurchasingPriceHistory,
  reopenPurchasingPrice,
  savePurchasingPrice,
  submitPurchasingPackageToCfo,
  uploadPurchasingAttachment,
} from "../../api/purchasingPriceReview.api";

export const purchasingPriceReviewKeys = {
  all: ["purchasing-price-review"],
  financialYears: () => ["purchasing-price-review", "financial-years"],
  packages: (financialYearId, priceStatus) => [
    "purchasing-price-review",
    "packages",
    financialYearId || null,
    priceStatus || "ALL",
  ],
  package: (packageId) => ["purchasing-price-review", "package", packageId],
  history: (packageId, packageSubItemId) => [
    "purchasing-price-review",
    "history",
    packageId,
    packageSubItemId,
  ],
  attachments: (packageId, packageSubItemId) => [
    "purchasing-price-review",
    "attachments",
    packageId,
    packageSubItemId,
  ],
};

export function usePurchasingFinancialYears() {
  return useQuery({
    queryKey: purchasingPriceReviewKeys.financialYears(),
    queryFn: getPurchasingFinancialYears,
  });
}

export function usePurchasingPackages(financialYearId, priceStatus = "ALL") {
  return useQuery({
    queryKey: purchasingPriceReviewKeys.packages(financialYearId, priceStatus),
    queryFn: () => getPurchasingPackages({ financialYearId, priceStatus }),
    enabled: Boolean(financialYearId),
  });
}

export function usePurchasingPackage(packageId) {
  return useQuery({
    queryKey: purchasingPriceReviewKeys.package(packageId),
    queryFn: () => getPurchasingPackage(packageId),
    enabled: Boolean(packageId),
  });
}

function usePackageMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (data && variables?.packageId) {
        queryClient.setQueryData(
          purchasingPriceReviewKeys.package(variables.packageId),
          data,
        );
      }
      queryClient.invalidateQueries({
        queryKey: purchasingPriceReviewKeys.all,
      });
    },
  });
}

export function useSavePurchasingPrice() {
  return usePackageMutation(savePurchasingPrice);
}

export function useAcceptPurchasingPrice() {
  return usePackageMutation(acceptPurchasingPrice);
}

export function useReopenPurchasingPrice() {
  return usePackageMutation(reopenPurchasingPrice);
}

export function useAcceptAllPurchasingPrices() {
  return usePackageMutation(acceptAllPurchasingPrices);
}

export function useSubmitPurchasingPackage() {
  return usePackageMutation(submitPurchasingPackageToCfo);
}

export function usePurchasingPriceHistory(packageId, packageSubItemId, enabled) {
  return useQuery({
    queryKey: purchasingPriceReviewKeys.history(packageId, packageSubItemId),
    queryFn: () => getPurchasingPriceHistory({ packageId, packageSubItemId }),
    enabled: Boolean(enabled && packageId && packageSubItemId),
  });
}

export function usePurchasingAttachments(packageId, packageSubItemId, enabled) {
  return useQuery({
    queryKey: purchasingPriceReviewKeys.attachments(packageId, packageSubItemId),
    queryFn: () => getPurchasingAttachments({ packageId, packageSubItemId }),
    enabled: Boolean(enabled && packageId && packageSubItemId),
  });
}

export function useUploadPurchasingAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPurchasingAttachment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: purchasingPriceReviewKeys.attachments(
          variables.packageId,
          variables.packageSubItemId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: purchasingPriceReviewKeys.package(variables.packageId),
      });
    },
  });
}

export function useDeletePurchasingAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePurchasingAttachment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: purchasingPriceReviewKeys.attachments(
          variables.packageId,
          variables.packageSubItemId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: purchasingPriceReviewKeys.package(variables.packageId),
      });
    },
  });
}

export function useDownloadPurchasingAttachment() {
  return useMutation({ mutationFn: downloadPurchasingAttachment });
}
