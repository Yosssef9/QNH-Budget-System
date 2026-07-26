export function categoryPackageSubmittedTemplate(payload = {}) {
  const categoryName = payload.categoryName || "Category";
  const financialYear = payload.financialYear || "-";
  const isResubmission = Boolean(payload.isResubmission);

  return {
    subject: `${categoryName} package ${
      isResubmission ? "resubmitted" : "submitted"
    } for CFO review - FY ${financialYear}`,
    status: "ACTION_REQUIRED",
    recipientName: payload.recipientName,
    title: `Category package ${
      isResubmission ? "resubmitted" : "submitted"
    }`,
    message:
      "A hospital-wide category package is ready for CFO review in the Budget System.",
    actionText: "Review Category Package",
    actionUrl: process.env.APP_URL,
    details: {
      Category: categoryName,
      "Financial Year": financialYear,
      "Submitted By": payload.submittedByName || payload.submittedBy || "-",
      "Package Items": payload.packageItemCount ?? "-",
      "Estimated Total": payload.estimatedTotal ?? "-",
      "Reconciliation": payload.reconciliationStatus || "-",
    },
  };
}
