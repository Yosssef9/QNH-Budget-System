import api from "./api";

export async function getBudgetAccessUsers({
  search = "",
  page = 1,
  pageSize = 50,
}) {
  const response = await api.get("/admin/budget-access/users", {
    params: {
      search,
      page,
      pageSize,
    },
  });

  return response.data;
}
