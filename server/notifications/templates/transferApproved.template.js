export function transferApprovedTemplate(payload) {
  return {
    subject: `Category transfer approved #${payload.transferId}`,

    status: "APPROVED",

    recipientName: payload.recipientName,

    title: "Category transfer approved",

    message:
      "Your category transfer request has been approved.",

    actionText: "Open Budget System",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      Category: payload.categoryName,
      From: `${payload.fromItemName || "-"} / ${payload.fromSubItemName || "-"}`,
      To: `${payload.toItemName || "-"} / ${payload.toSubItemName || "-"}`,
      "Source Quantity": payload.sourceQuantity,
      "Destination Quantity": payload.destinationQuantity,
      Amount: payload.amount,
    },
  };
}
