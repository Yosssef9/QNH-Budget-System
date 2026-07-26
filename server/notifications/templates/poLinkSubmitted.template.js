export function poLinkSubmittedTemplate(payload) {
  return {
    status: "ACTION_REQUIRED",

    subject: `PO Link Request #${payload.poLinkId}`,

    title: "New PO Link Request",

    recipientName: payload.recipientName,

    message: "A new Purchase Order link request requires approval.",

    actionText: "Review PO Link Request",

    actionUrl: process.env.APP_URL,

    details: {
      "PO Link ID": payload.poLinkId,
      Category: payload.category,
      Item: payload.itemDescription,
      "Package Sub-Item": payload.packageSubItem,
      "Requested Quantity": payload.requestedQuantity,
      "Requested By": payload.requestedBy,
    },
  };
}
