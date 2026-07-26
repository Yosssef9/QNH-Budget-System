export function departmentCategoryBudgetSubmittedTemplate(payload = {}) {
  const categoryName = payload.categoryName || "Category";
  const departmentName = payload.departmentName || "Department";
  const financialYear = payload.financialYear || "-";

  return {
    subject: `${categoryName} budget submitted by ${departmentName} - FY ${financialYear}`,
    status: "ACTION_REQUIRED",
    recipientName: payload.recipientName,
    title: "Department category budget submitted",
    message:
      "A department category budget has been submitted and is ready for Category Manager review.",
    actionText: "Review Department Budget",
    actionUrl: process.env.APP_URL,
    details: {
      Department: departmentName,
      Category: categoryName,
      "Financial Year": financialYear,
      "Submitted By": payload.submittedByName || payload.submittedBy || "-",
      "Item Count": payload.itemCount ?? "-",
    },
  };
}
