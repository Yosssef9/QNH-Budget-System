export function budgetSubmittedTemplate(payload) {
  return {
    subject: `Budget Submitted - ${payload.budgetName}`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Budget Approval Required",

    message: "A budget has been submitted and requires your approval.",

    actionText: "Review Budget",

    actionUrl: process.env.APP_URL,

    details: {
      Budget: payload.budgetName,
      Department: payload.departmentName,
      SubmittedBy: payload.submittedBy,
    },
  };
}
