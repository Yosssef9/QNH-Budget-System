export function transferRejectedTemplate(payload) {
  return {
    subject: `Category transfer rejected #${payload.transferId}`,

    status: "REJECTED",

    recipientName: payload.recipientName,

    title: "Category transfer rejected",

    message: "Your category transfer request has been rejected.",

    actionText: "View Transfer",

    actionUrl: process.env.APP_URL,

    details: {
      "Transfer ID": payload.transferId,
      Category: payload.categoryName,
      From: `${payload.fromItemName || "-"} / ${payload.fromSubItemName || "-"}`,
      To: `${payload.toItemName || "-"} / ${payload.toSubItemName || "-"}`,
      Amount: payload.amount,
      Reason: payload.reason,
    },
  };
}
