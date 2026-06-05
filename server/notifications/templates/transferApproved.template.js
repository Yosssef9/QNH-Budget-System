export function transferApprovedTemplate(payload) {
  return {
    subject: `Transfer #${payload.transferId} Approved`,

    status: "APPROVED",

    recipientName: payload.recipientName,

    title: "Transfer Approved Successfully",

    message:
      "Your transfer request has been approved and the budget has been updated successfully.",

    actionText: "Open Budget System",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      Budget: payload.budgetName,
      Amount: payload.amount,
      "Approved By": payload.approvedBy,
    },
  };
}
