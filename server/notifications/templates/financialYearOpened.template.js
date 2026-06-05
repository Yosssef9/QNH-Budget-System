export function financialYearOpenedTemplate(payload) {
  return {
    subject: `Financial Year ${payload.year} Opened`,

    status: "INFO",

    recipientName: payload.recipientName,

    title: "Financial Year Opened",

    message: "The financial year is now open for budget preparation.",

    actionText: "Open System",

    actionUrl: process.env.APP_URL,

    details: {
      Year: payload.year,
    },
  };
}
