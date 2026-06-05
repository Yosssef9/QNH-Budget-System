export function financialYearClosedTemplate(payload) {
  return {
    subject: `Financial Year ${payload.year} Closed`,

    status: "INFO",

    recipientName: payload.recipientName,

    title: "Financial Year Closed",

    message: "The financial year has been closed successfully.",

    actionText: "Open System",

    actionUrl: process.env.APP_URL,

    details: {
      Year: payload.year,
    },
  };
}
