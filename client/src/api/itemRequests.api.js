import api from "./api";

export async function getItemRequests(status = "PENDING") {
  const response = await api.get("/item-requests", {
    params: { status },
  });

  return response.data?.data || [];
}

export async function createItemRequest(payload) {
  const response = await api.post("/item-requests", payload);
  return response.data?.data;
}

export async function approveItemRequest({ requestId, adminNote }) {
  const response = await api.post(`/item-requests/${requestId}/approve`, {
    adminNote,
  });

  return response.data?.data;
}

export async function approveAndCreateItemRequest({
  requestId,
  adminNote,
  unitOfMeasureId,
}) {
  const response = await api.post(
    `/item-requests/${requestId}/approve-and-create`,
    {
      adminNote,
      unitOfMeasureId,
    },
  );

  return response.data?.data;
}

export async function rejectItemRequest({ requestId, adminNote }) {
  const response = await api.post(`/item-requests/${requestId}/reject`, {
    adminNote,
  });

  return response.data?.data;
}
