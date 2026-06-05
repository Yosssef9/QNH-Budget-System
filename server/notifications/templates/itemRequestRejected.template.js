export function itemRequestRejectedTemplate(payload) {
  return {
    subject: `Item Request Rejected`,

    status: "REJECTED",

    recipientName: payload.recipientName,

    title: "Item Request Rejected",

    message: "Your budget item request has been rejected.",

    actionText: "Open Budget",

    actionUrl: process.env.APP_URL,

    details: {
      Item: payload.itemName,
      RejectedBy: payload.rejectedBy,
      Reason: payload.reason,
    },
  };
}
