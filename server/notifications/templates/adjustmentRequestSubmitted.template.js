export function adjustmentRequestSubmittedTemplate(payload = {}) {
  const itemName = payload.itemName || "Budget item";
  const departmentName = payload.departmentName || "Department";
  const categoryName = payload.categoryName || "Category";

  return {
    subject: `Adjustment request from ${departmentName} - ${categoryName}`,
    status: "ACTION_REQUIRED",
    recipientName: payload.recipientName,
    title: "Department adjustment request submitted",
    message:
      "A department submitted an adjustment request for your assigned category.",
    actionText: "View Adjustment Request",
    actionUrl: process.env.APP_URL,
    details: {
      Department: departmentName,
      Category: categoryName,
      Item: itemName,
      "Current Approved Quantity": payload.currentApprovedQuantity ?? "-",
      "Requested Quantity": payload.requestedQuantity ?? "-",
      Difference: payload.quantityDifference ?? "-",
      Reason: payload.reason || "-",
      "Financial Year": payload.financialYear || "-",
    },
  };
}
