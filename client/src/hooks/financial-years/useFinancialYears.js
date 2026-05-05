import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeFinancialYear,
  createFinancialYear,
  getFinancialYears,
  getOpenFinancialYear,
} from "../../api/financialYears.api";

export function useFinancialYears() {
  return useQuery({
    queryKey: ["financial-years"],
    queryFn: getFinancialYears,
  });
}

export function useOpenFinancialYear() {
  return useQuery({
    queryKey: ["financial-years", "open"],
    queryFn: getOpenFinancialYear,
    retry: false,
  });
}

export function useCreateFinancialYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFinancialYear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-years"] });
      queryClient.invalidateQueries({ queryKey: ["financial-years", "open"] });
    },
  });
}

export function useCloseFinancialYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeFinancialYear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-years"] });
      queryClient.invalidateQueries({ queryKey: ["financial-years", "open"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
