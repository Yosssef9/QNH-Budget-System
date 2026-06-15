export function getTransferPageLock(budgets = []) {
  return getPreClosingApprovedBudgetPageLock(budgets, {
    title: "Transfers Locked",
    message:
      "Transfer requests are not available right now because the transfer requirements are not completed.",
  });
}

export function getPOLinkPageLock(budgets = []) {
  return getPreClosingApprovedBudgetPageLock(budgets, {
    title: "PO Linking Locked",
    message:
      "PO linking is not available right now because the PO linking requirements are not completed.",
  });
}

function getPreClosingApprovedBudgetPageLock(budgets = [], config) {
  const hasApprovedPreClosingBudget = budgets.some(
    (budget) =>
      budget.status === "APPROVED" &&
      budget.financial_year_status === "PRE_CLOSING",
  );

  if (hasApprovedPreClosingBudget) {
    return {
      locked: false,
      title: "",
      message: "",
      reasons: [],
    };
  }

  const hasApprovedBudget = budgets.some(
    (budget) => budget.status === "APPROVED",
  );

  const hasPreClosingYear = budgets.some(
    (budget) => budget.financial_year_status === "PRE_CLOSING",
  );

  const reasons = [];

  if (!hasApprovedBudget) {
    reasons.push("Your department budget must be approved first.");
  }

  if (!hasPreClosingYear) {
    reasons.push("The financial year must be in PRE_CLOSING status.");
  }

  return {
    locked: true,
    title: config.title,
    message: config.message,
    reasons,
  };
}

export function getBudgetEntryPageLock(openYear) {
  if (openYear?.status === "PRE_CLOSING") {
    return {
      locked: true,
      title: "Budget Entry Locked",
      message:
        "Budget Entry is locked because the financial year is in Pre-Closing status.",
      reasons: [
        "Budget creation and editing are no longer allowed.",
        "Use Transfers and PO Linking during Pre-Closing.",
      ],
    };
  }

  if (openYear?.status === "CLOSED") {
    return {
      locked: true,
      title: "Budget Entry Locked",
      message:
        "Budget Entry is locked because the financial year has been closed.",
      reasons: ["Budget changes are no longer allowed."],
    };
  }

  return {
    locked: false,
    title: "",
    message: "",
    reasons: [],
  };
}
