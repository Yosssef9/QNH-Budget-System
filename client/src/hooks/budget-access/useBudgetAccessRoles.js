import { useQuery } from "@tanstack/react-query";
import { getBudgetAccessRoles } from "../../api/budgetAccessRoles.api";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useBudgetAccessRoles() {
  return useQuery({
    queryKey: ["budgetAccessRoles"],
    queryFn: getBudgetAccessRoles,
    staleTime: FIVE_MINUTES,
  });
}
