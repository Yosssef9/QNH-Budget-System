export function poLinkSubmittedTemplate(payload) {
  return {
    status: "ACTION_REQUIRED",

    subject: `PO Link Request #${payload.poLinkId}`,

    title: "New PO Link Request",

    recipientName: payload.recipientName,

    message: "A new Purchase Order link request requires approval.",

    details: {
      "PO Link ID": payload.poLinkId,
      Item: payload.itemDescription,
      "Requested Quantity": payload.requestedQuantity,
      "Requested By": payload.requestedBy,
    },
  };
}
