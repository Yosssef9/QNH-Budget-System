import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeFinancialYear,
  createFinancialYear,
  getFinancialYears,
  getActiveFinancialYear,
  preCloseFinancialYear,
} from "../../api/financialYears.api";

export function useFinancialYears() {
  return useQuery({
    queryKey: ["financial-years"],
    queryFn: getFinancialYears,
  });
}

export function useActiveFinancialYear() {
  return useQuery({
    queryKey: ["financial-years", "active"],
    queryFn: getActiveFinancialYear,
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
export function usePreCloseFinancialYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preCloseFinancialYear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-years"] });
      queryClient.invalidateQueries({ queryKey: ["financial-years", "open"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
