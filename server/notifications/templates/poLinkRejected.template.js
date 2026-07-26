export function poLinkRejectedTemplate(payload) {
  return {
    status: "REJECTED",

    subject: `PO Link Rejected #${payload.poLinkId}`,

    title: "PO Link Rejected",

    recipientName: payload.recipientName,

    message: "Your Purchase Order link request has been rejected.",

    actionText: "View PO Link Request",

    actionUrl: process.env.APP_URL,

    details: {
      "PO Link ID": payload.poLinkId,
      "Package Sub-Item": payload.packageSubItem,
      Reason: payload.reason,
    },
  };
}
