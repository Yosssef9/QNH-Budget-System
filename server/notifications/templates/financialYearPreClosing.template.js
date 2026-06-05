export function financialYearPreClosingTemplate(payload) {
  return {
    subject: `Financial Year ${payload.year} Pre-Closing`,

    status: "ACTION_REQUIRED",

    recipientName: payload.recipientName,

    title: "Financial Year Pre-Closing",

    message: "Please complete all pending budget activities before closing.",

    actionText: "Open System",

    actionUrl: process.env.APP_URL,

    details: {
      Year: payload.year,
    },
  };
}
