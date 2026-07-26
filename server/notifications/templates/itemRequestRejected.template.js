export function itemRequestRejectedTemplate(payload) {
  return {
    subject: `Catalog item request rejected: ${payload.itemName || payload.requestId}`,

    status: "REJECTED",

    recipientName: payload.recipientName,

    title: "Item Request Rejected",

    message: "Your budget item request has been rejected.",

    actionText: "Open Budget",

    actionUrl: process.env.APP_URL,

    details: {
      Item: payload.itemName,
      Category: payload.categoryName,
      RejectedBy: payload.rejectedBy,
      Reason: payload.reason,
    },
  };
}
