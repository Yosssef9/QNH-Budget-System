import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBudgetAccessAssignments,
  createBudgetAccessAssignment,
  updateBudgetAccessAssignment,
  updateBudgetAccessAssignmentStatus,
} from "../../api/budgetAccessAssignments.api";

const QUERY_KEY = ["budgetAccessAssignments"];
const FIVE_MINUTES = 5 * 60 * 1000;

// 🔹 Get all assignments
export function useBudgetAccessAssignments() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getBudgetAccessAssignments,
    staleTime: FIVE_MINUTES,
  });
}

// 🔹 Create
export function useCreateBudgetAccessAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBudgetAccessAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// 🔹 Update
export function useUpdateBudgetAccessAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) =>
      updateBudgetAccessAssignment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// 🔹 Toggle Status
export function useToggleBudgetAccessAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }) =>
      updateBudgetAccessAssignmentStatus(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}