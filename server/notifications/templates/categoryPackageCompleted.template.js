export function categoryPackageCompletedTemplate(payload = {}) {
  const categoryName = payload.categoryName || "Category";
  const financialYear = payload.financialYear || "-";

  return {
    subject: `${categoryName} package CFO review completed - FY ${financialYear}`,
    status: "APPROVED",
    recipientName: payload.recipientName,
    title: "CFO package review completed",
    message:
      "The CFO completed review of this category package. The package is now locked for normal preparation changes.",
    actionText: "Open Budget System",
    actionUrl: process.env.APP_URL,
    details: {
      Category: categoryName,
      "Financial Year": financialYear,
      "Completed By": payload.completedByName || payload.completedBy || "-",
      "Accepted Items": payload.acceptedItemCount ?? "-",
      "Final Package Value": payload.finalPackageValue ?? "-",
    },
  };
}
