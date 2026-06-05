export function budgetApprovedTemplate(payload) {
  return {
    subject: `Budget Approved - ${payload.budgetName}`,

    status: "APPROVED",

    recipientName: payload.recipientName,

    title: "Budget Approved",

    message: "Your budget has been approved successfully.",

    actionText: "Open Budget",

    actionUrl: process.env.APP_URL,

    details: {
      Budget: payload.budgetName,
      Department: payload.departmentName,
      ApprovedBy: payload.approvedBy,
    },
  };
}
