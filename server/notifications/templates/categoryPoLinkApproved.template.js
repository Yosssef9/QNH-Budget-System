export function categoryPoLinkApprovedTemplate(payload) {
  return {
    status: "APPROVED",

    subject: `Category PO Link Approved #${payload.poLinkId}`,

    title: "Category PO Link Approved",

    recipientName: payload.recipientName,

    message: "Your sub-item Purchase Order link request has been approved.",

    details: {
      "PO Link ID": payload.poLinkId,
      "Sub Item": payload.subItemName,
      "Approved By": payload.approvedBy,
    },
  };
}
