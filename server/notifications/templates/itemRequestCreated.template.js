export function itemRequestCreatedTemplate(payload) {
  return {
    subject: `New catalog item request: ${payload.itemName || payload.requestId}`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Catalog item request requires review",

    message: "A new budget item request requires your review.",

    actionText: "Review Request",

    actionUrl: process.env.APP_URL,

    details: {
      Item: payload.itemName,
      Category: payload.categoryName,
      "Unit of Measure": payload.unitOfMeasure,
      "Expense Type": payload.expenseType,
      RequestedBy: payload.requestedBy,
    },
  };
}
