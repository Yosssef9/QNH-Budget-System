import api from "./api";

export async function createTransfer(payload) {
  const { data } = await api.post("/transfers", payload);
  return data.data;
}

export async function approveTransfer(id) {
  const { data } = await api.post(`/transfers/${id}/approve`);
  return data.data;
}

export async function rejectTransfer(id, note) {
  const { data } = await api.post(`/transfers/${id}/reject`, { note });

  return data.data;
}

export async function getTransferItems() {
  const { data } = await api.get("/transfers/items");
  return data.data || [];
}

export async function getTransferById(id) {
  const { data } = await api.get(`/transfers/${id}`);
  return data.data;
}

export async function getMyTransfers() {
  const { data } = await api.get("/transfers/my");
  return data.data || [];
}

export async function getTransfers(status = "PENDING_APPROVAL") {
  const { data } = await api.get("/transfers", {
    params: status && status !== "ALL" ? { status } : {},
  });

  return data.data || [];
}

export async function getTransferDashboard() {
  const { data } = await api.get("/transfers/dashboard");

  return data.data;
}
