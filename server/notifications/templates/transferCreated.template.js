export function transferCreatedTemplate(payload) {
  return {
    subject: `Transfer Request #${payload.transferId}`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Transfer Request Requires Review",

    message:
      "A new transfer request has been submitted and requires your review.",

    actionText: "Review Transfer",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      Budget: payload.budgetName,
      Amount: payload.amount,
      RequestedBy: payload.requestedBy,
    },
  };
}
