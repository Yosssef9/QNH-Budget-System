import { getBudgetAccessDepartmentsRepo } from "../repositories/budgetAccessDepartments.repository.js";

export async function getBudgetAccessDepartmentsService() {
  return await getBudgetAccessDepartmentsRepo();
}
