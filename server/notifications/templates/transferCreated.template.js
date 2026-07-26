export function transferCreatedTemplate(payload) {
  return {
    subject: `Category transfer submitted - ${payload.categoryName || "Category"}`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Category transfer requires review",

    message:
      "A Category Manager submitted a transfer request between package sub-items.",

    actionText: "Review Transfer",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      Category: payload.categoryName,
      "Financial Year": payload.financialYear,
      From: `${payload.fromItemName || "-"} / ${payload.fromSubItemName || "-"}`,
      To: `${payload.toItemName || "-"} / ${payload.toSubItemName || "-"}`,
      "Source Quantity": payload.sourceQuantity,
      "Destination Quantity": payload.destinationQuantity,
      Amount: payload.amount,
      RequestedBy: payload.requestedBy,
      Reason: payload.reason,
    },
  };
}
