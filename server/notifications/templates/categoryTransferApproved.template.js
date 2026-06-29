export function categoryTransferApprovedTemplate(payload) {
  return {
    subject: `Category Transfer #${payload.transferId} Approved`,

    status: "APPROVED",

    recipientName: payload.recipientName,

    title: "Category Transfer Approved",

    message: "Your category transfer request has been approved.",

    actionText: "Open Budget System",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      "Financial Year": payload.financialYear,
      Category: payload.categoryName,
      From: payload.fromItemName,
      To: payload.toItemName,
      Amount: payload.amount,
      "Approved By": payload.approvedBy,
    },
  };
}
