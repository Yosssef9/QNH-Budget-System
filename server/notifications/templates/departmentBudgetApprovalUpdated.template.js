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
    details: [
      { label: "Department", value: payload.departmentName || "Department" },
      { label: "Category", value: categoryName },
      { label: "Item", value: itemName },
      { label: "Previous approved quantity", value: previousQuantity },
      { label: "New approved quantity", value: newQuantity },
      { label: "Financial year", value: payload.financialYear || "-" },
    ],
  };
}
