import api from "./api";

export async function getTransfers() {
  const { data } = await api.get("/transfers");
  return data;
}

export async function createTransfer(payload) {
  const { data } = await api.post("/transfers", payload);
  return data;
}

export async function approveTransfer(id) {
  const { data } = await api.post(`/transfers/${id}/approve`);
  return data;
}

export async function rejectTransfer(id, note) {
  const { data } = await api.post(`/transfers/${id}/reject`, { note });
  return data;
}

export async function getTransferItems(financialYearId) {
  const { data } = await api.get("/budget-items/transfer-items", {
    params: {
      financialYearId,
    },
  });

  return data;
}
export async function getPendingTransfers() {
  const { data } = await api.get("/transfers/pending");

  return data;
}
export async function getTransferById(id) {
  const { data } = await api.get(`/transfers/${id}`);

  return data;
}
