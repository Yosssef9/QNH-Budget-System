import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDepartment,
  getDepartments,
  updateDepartmentDescription,
  updateDepartmentStatus,
} from "../../api/departments.api";

export const departmentsQueryKey = ["departments"];

function useInvalidateDepartmentData() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["budgetAccessDepartments"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useDepartments() {
  return useQuery({
    queryKey: departmentsQueryKey,
    queryFn: () => getDepartments({ status: "ALL" }),
  });
}

export function useCreateDepartment() {
  const invalidate = useInvalidateDepartmentData();

  return useMutation({
    mutationFn: createDepartment,
    onSuccess: invalidate,
  });
}

export function useUpdateDepartmentDescription() {
  const invalidate = useInvalidateDepartmentData();

  return useMutation({
    mutationFn: ({ departmentId, description }) =>
      updateDepartmentDescription(departmentId, { description }),
    onSuccess: invalidate,
  });
}

export function useUpdateDepartmentStatus() {
  const invalidate = useInvalidateDepartmentData();

  return useMutation({
    mutationFn: ({ departmentId, isActive }) =>
      updateDepartmentStatus(departmentId, isActive),
    onSuccess: invalidate,
  });
}
