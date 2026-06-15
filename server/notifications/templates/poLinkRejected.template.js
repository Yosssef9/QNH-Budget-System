export function poLinkRejectedTemplate(payload) {
  return {
    status: "REJECTED",

    subject: `PO Link Rejected #${payload.poLinkId}`,

    title: "PO Link Rejected",

    recipientName: payload.recipientName,

    message: "Your Purchase Order link request has been rejected.",

    details: {
      "PO Link ID": payload.poLinkId,
      Reason: payload.reason,
    },
  };
}
