export function categoryPoLinkSubmittedTemplate(payload) {
  return {
    status: "ACTION_REQUIRED",

    subject: `Category PO Link Request #${payload.poLinkId}`,

    title: "New Category PO Link Request",

    recipientName: payload.recipientName,

    message: "A new sub-item Purchase Order link request requires approval.",

    details: {
      "PO Link ID": payload.poLinkId,
      Category: payload.categoryName,
      "Budget Type": payload.budgetTypeName,
      "Sub Item": payload.subItemName,
      "PO Item": payload.itemDescription,
      "Requested Quantity": payload.requestedQuantity,
      "Requested By": payload.requestedBy,
    },
  };
}
