export function categoryTransferSubmittedTemplate(payload) {
  return {
    subject: `Category Transfer Request #${payload.transferId}`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Category Transfer Requires Review",

    message:
      "A Category Budget Manager submitted a transfer request that requires approval.",

    actionText: "Review Transfer",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      "Financial Year": payload.financialYear,
      Category: payload.categoryName,
      From: payload.fromItemName,
      To: payload.toItemName,
      Amount: payload.amount,
      Reason: payload.reason,
      RequestedBy: payload.requestedBy,
    },
  };
}
