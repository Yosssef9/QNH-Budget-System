export function itemRequestApprovedTemplate(payload) {
  return {
    subject: `Item Request Approved`,

    status: "APPROVED",

    recipientName: payload.recipientName,

    title: "Item Request Approved",

    message: "Your budget item request has been approved.",

    actionText: "Open Budget",

    actionUrl: process.env.APP_URL,

    details: {
      Item: payload.itemName,
      ApprovedBy: payload.approvedBy,
    },
  };
}
