export function poLinkApprovedTemplate(payload) {
  return {
    status: "APPROVED",

    subject: `PO Link Approved #${payload.poLinkId}`,

    title: "PO Link Approved",

    recipientName: payload.recipientName,

    message: "Your Purchase Order link request has been approved.",

    actionText: "View PO Link Request",

    actionUrl: process.env.APP_URL,

    details: {
      "PO Link ID": payload.poLinkId,
      "Package Sub-Item": payload.packageSubItem,
    },
  };
}
