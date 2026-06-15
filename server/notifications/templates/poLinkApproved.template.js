export function poLinkApprovedTemplate(payload) {
  return {
    status: "APPROVED",

    subject: `PO Link Approved #${payload.poLinkId}`,

    title: "PO Link Approved",

    recipientName: payload.recipientName,

    message: "Your Purchase Order link request has been approved.",

    details: {
      "PO Link ID": payload.poLinkId,
    },
  };
}
