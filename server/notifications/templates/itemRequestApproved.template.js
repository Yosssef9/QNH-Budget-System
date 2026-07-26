export function itemRequestApprovedTemplate(payload) {
  return {
    subject: `Catalog item request approved: ${payload.itemName || payload.requestId}`,

    status: "APPROVED",

    recipientName: payload.recipientName,

    title: "Item Request Approved",

    message: payload.autoCreated
      ? "Your budget item request has been approved and the catalog item was created."
      : "Your budget item request has been approved.",

    actionText: "Open Budget",

    actionUrl: process.env.APP_URL,

    details: {
      Item: payload.itemName,
      Category: payload.categoryName,
      "Unit of Measure": payload.unitOfMeasure,
      "Catalog Item Created": payload.autoCreated ? "Yes" : "No",
      ApprovedBy: payload.approvedBy,
    },
  };
}
