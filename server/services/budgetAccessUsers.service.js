import { getBudgetAccessUsersRepo } from "../repositories/budgetAccessUsers.repository.js";

export async function getBudgetAccessUsersService(query = {}) {
  return await getBudgetAccessUsersRepo({
    search: query.search || "",
    page: query.page || 1,
    pageSize: query.pageSize || 50,
  });
}
