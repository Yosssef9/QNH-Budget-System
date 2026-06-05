export function itemRequestCreatedTemplate(payload) {
  return {
    subject: `Item Request #${payload.requestId}`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Item Request Requires Approval",

    message: "A new budget item request requires your review.",

    actionText: "Review Request",

    actionUrl: process.env.APP_URL,

    details: {
      Item: payload.itemName,
      RequestedBy: payload.requestedBy,
    },
  };
}
