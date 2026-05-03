import { getBudgetRolesRepo } from "../repositories/budgetAccessRoles.repository.js";

export async function getBudgetRolesService() {
  return await getBudgetRolesRepo();
}
