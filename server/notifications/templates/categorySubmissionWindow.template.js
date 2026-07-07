export function categorySubmissionWindowTemplate(payload) {
  const statusLabel =
    payload.status === "CLOSED" ? "Closed" : "Reopened";

  return {
    subject: `${payload.categoryName} Submission Window ${statusLabel}`,
    status: payload.status === "CLOSED" ? "WARNING" : "ACTION_REQUIRED",
    recipientName: payload.recipientName,
    title: `${payload.categoryName} Submission Window ${statusLabel}`,
    message:
      payload.status === "CLOSED"
        ? "Department submissions for this category are now closed."
        : "Department submissions for this category have been reopened.",
    actionText: "Open Budget System",
    actionUrl: process.env.APP_URL,
    details: {
      Category: payload.categoryName,
      "Financial Year": payload.financialYear,
      Status: payload.status,
      Reason: payload.reason || "-",
    },
  };
}
