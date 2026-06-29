export function categoryPoLinkRejectedTemplate(payload) {
  return {
    status: "REJECTED",

    subject: `Category PO Link Rejected #${payload.poLinkId}`,

    title: "Category PO Link Rejected",

    recipientName: payload.recipientName,

    message: "Your sub-item Purchase Order link request has been rejected.",

    details: {
      "PO Link ID": payload.poLinkId,
      "Sub Item": payload.subItemName,
      RejectedBy: payload.rejectedBy,
      Reason: payload.reason,
    },
  };
}
