export function cfoAnnualPackageReviewFinalizedTemplate(payload = {}) {
  const financialYear = payload.financialYear || payload.year || "-";

  return {
    subject: `Annual package review finalized - FY ${financialYear}`,
    status: "APPROVED",
    recipientName: payload.recipientName,
    title: "Annual package review finalized",
    message:
      "All category packages have completed CFO review. The financial year is ready for the next lifecycle action when all rules pass.",
    actionText: "Open Budget System",
    actionUrl: process.env.APP_URL,
    details: {
      "Financial Year": financialYear,
      "Finalized By": payload.finalizedByName || payload.finalizedBy || "-",
      "Completed Packages": payload.completedPackageCount ?? "-",
      "Total Packages": payload.totalPackageCount ?? "-",
    },
  };
}
