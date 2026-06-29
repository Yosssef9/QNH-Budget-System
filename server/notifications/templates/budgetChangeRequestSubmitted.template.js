export function budgetChangeRequestSubmittedTemplate(payload) {
  return {
    subject: `Budget Change Request - ${payload.departmentName} / ${payload.categoryName} / ${payload.budgetTypeName}`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Budget Change Request Submitted",

    message:
      "A department submitted a change request for an approved category budget.",

    actionText: "Review Change Request",

    actionUrl: process.env.APP_URL,

    details: {
      Department: payload.departmentName,
      Category: payload.categoryName,
      Item: payload.budgetTypeName,
      RequestType: payload.requestType,
      CurrentApprovedQuantity: payload.currentApprovedQuantity,
      RequestedQuantity: payload.requestedQuantity,
      QuantityDelta: payload.quantityDelta,
      Reason: payload.reason,
      SubmittedBy: payload.requestedByName,
    },
  };
}
