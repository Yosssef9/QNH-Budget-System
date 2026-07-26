export function departmentBudgetApprovalUpdatedTemplate(payload = {}) {
  const itemName = payload.itemName || "Budget item";
  const categoryName = payload.categoryName || "Category";
  const previousQuantity =
    payload.previousApprovedQuantity === null ||
    payload.previousApprovedQuantity === undefined
      ? "Not reviewed"
      : payload.previousApprovedQuantity;
  const newQuantity =
    payload.newApprovedQuantity === null ||
    payload.newApprovedQuantity === undefined
      ? "Not reviewed"
      : payload.newApprovedQuantity;

  return {
    subject: `${categoryName} approval updated: ${itemName}`,
    title: "Department budget approval updated",
    message:
      payload.reviewNote ||
      `The approved quantity for ${itemName} has been updated by the Category Manager.`,
    status: "INFO",
    actionText: "View Budget Decisions",
    actionUrl: process.env.APP_URL,
    details: {
      Department: payload.departmentName || "Department",
      Category: categoryName,
      Item: itemName,
      "Requested Quantity": payload.requestedQuantity ?? "-",
      "Previous Approved Quantity": previousQuantity,
      "New Approved Quantity": newQuantity,
      Difference:
        previousQuantity === "Not reviewed" || newQuantity === "Not reviewed"
          ? "-"
          : Number(newQuantity) - Number(previousQuantity),
      "Financial Year": payload.financialYear || "-",
    },
  };
}
