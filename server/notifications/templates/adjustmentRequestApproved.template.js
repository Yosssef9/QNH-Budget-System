export function adjustmentRequestApprovedTemplate(payload = {}) {
  const itemName = payload.itemName || "Budget item";

  return {
    subject: `Adjustment request approved for action: ${itemName}`,
    status: "APPROVED",
    recipientName: payload.recipientName,
    title: "Adjustment request approved for action",
    message:
      "Your adjustment request was approved for action. Budget balances will change only through the controlled transfer process.",
    actionText: "View Adjustment Request",
    actionUrl: process.env.APP_URL,
    details: {
      Department: payload.departmentName || "Department",
      Category: payload.categoryName || "Category",
      Item: itemName,
      "Current Approved Quantity": payload.currentApprovedQuantity ?? "-",
      "Requested Quantity": payload.requestedQuantity ?? "-",
      "Category Manager Note": payload.note || "-",
      "Financial Year": payload.financialYear || "-",
    },
  };
}
