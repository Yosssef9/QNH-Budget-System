export function categoryTransferRejectedTemplate(payload) {
  return {
    subject: `Category Transfer #${payload.transferId} Rejected`,

    status: "REJECTED",

    recipientName: payload.recipientName,

    title: "Category Transfer Rejected",

    message: "Your category transfer request has been rejected.",

    actionText: "Open Budget System",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      "Financial Year": payload.financialYear,
      Category: payload.categoryName,
      From: payload.fromItemName,
      To: payload.toItemName,
      Amount: payload.amount,
      RejectedBy: payload.rejectedBy,
      Reason: payload.reason,
    },
  };
}
