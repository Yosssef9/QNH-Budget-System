export function budgetReturnedTemplate(payload) {
  return {
    subject: `Budget Returned - ${payload.budgetName}`,

    status: "REJECTED",

    recipientName: payload.recipientName,

    title: "Budget Returned",

    message: "The budget has been returned for modification.",

    actionText: "Open Budget",

    actionUrl: process.env.APP_URL,

    details: {
      Budget: payload.budgetName,
      ReturnedBy: payload.returnedBy,
      Reason: payload.reason,
    },
  };
}
