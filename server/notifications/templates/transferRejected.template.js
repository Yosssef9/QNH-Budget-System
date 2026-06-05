export function transferRejectedTemplate(payload) {
  return {
    subject: `Transfer #${payload.transferId} Rejected`,

    status: "REJECTED",

    recipientName: payload.recipientName,

    title: "Transfer Rejected",

    message: "Your transfer request has been rejected.",

    actionText: "View Transfer",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      Budget: payload.budgetName,
      Amount: payload.amount,
      RejectedBy: payload.rejectedBy,
      Reason: payload.reason,
    },
  };
}
