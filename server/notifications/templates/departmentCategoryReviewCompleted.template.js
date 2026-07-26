export function departmentCategoryReviewCompletedTemplate(payload = {}) {
  const categoryName = payload.categoryName || "Category";
  const departmentName = payload.departmentName || "Department";
  const financialYear = payload.financialYear || "-";

  return {
    subject: `${categoryName} review completed for ${departmentName} - FY ${financialYear}`,
    status: "INFO",
    recipientName: payload.recipientName,
    title: "Category review completed",
    message:
      "The Category Manager completed review of your department category budget. The reviewed decisions are available in the Budget System.",
    actionText: "View Budget Decisions",
    actionUrl: process.env.APP_URL,
    details: {
      Department: departmentName,
      Category: categoryName,
      "Financial Year": financialYear,
      "Reviewed Items": payload.reviewedItemCount ?? "-",
      "Completed By": payload.completedByName || payload.completedBy || "-",
    },
  };
}
