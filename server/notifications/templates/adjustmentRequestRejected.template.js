export function adjustmentRequestRejectedTemplate(payload = {}) {
  const itemName = payload.itemName || "Budget item";

  return {
    subject: `Adjustment request rejected: ${itemName}`,
    status: "REJECTED",
    recipientName: payload.recipientName,
    title: "Adjustment request rejected",
    message: "Your adjustment request was rejected by the Category Manager.",
    actionText: "View Adjustment Request",
    actionUrl: process.env.APP_URL,
    details: {
      Department: payload.departmentName || "Department",
      Category: payload.categoryName || "Category",
      Item: itemName,
      "Requested Quantity": payload.requestedQuantity ?? "-",
      Reason: payload.note || "-",
      "Financial Year": payload.financialYear || "-",
    },
  };
}
