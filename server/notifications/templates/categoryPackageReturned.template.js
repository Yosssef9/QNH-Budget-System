export function categoryPackageReturnedTemplate(payload = {}) {
  const categoryName = payload.categoryName || "Category";
  const financialYear = payload.financialYear || "-";

  return {
    subject: `${categoryName} package returned by CFO - FY ${financialYear}`,
    status: "REJECTED",
    recipientName: payload.recipientName,
    title: "Category package returned",
    message:
      "The CFO returned this category package. Review the package-level reason and the items marked for modification.",
    actionText: "View Package Return Notes",
    actionUrl: process.env.APP_URL,
    details: {
      Category: categoryName,
      "Financial Year": financialYear,
      "Return Reason": payload.reason || "-",
      "Returned By": payload.returnedByName || payload.returnedBy || "-",
      "Items Needing Modification": payload.needsModificationCount ?? "-",
    },
  };
}
