import { useQuery } from "@tanstack/react-query";
import { getBudgetAccessDepartments } from "../../api/budgetAccessDepartments.api";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useBudgetAccessDepartments() {
  return useQuery({
    queryKey: ["budgetAccessDepartments"],
    queryFn: getBudgetAccessDepartments,
    staleTime: FIVE_MINUTES,
  });
}