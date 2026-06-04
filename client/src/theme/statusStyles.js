import { formatStatus } from "../utils/statusFormatter";


export const BUDGET_STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

export const BUDGET_STATUS_STYLES = {
  DRAFT: {
    badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100/60",
    activeCard: "border-blue-300 bg-blue-50 shadow-sm",
    inactiveCard:
      "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
  },

  PENDING_APPROVAL: {
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100/60",
    activeCard: "border-amber-300 bg-amber-50 shadow-sm",
    inactiveCard:
      "border-slate-200 bg-white hover:border-amber-200 hover:bg-slate-50",
  },

  APPROVED: {
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100/60",
    activeCard: "border-emerald-300 bg-emerald-50 shadow-sm",
    inactiveCard:
      "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50",
  },

  RETURNED: {
    badge: "bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100/60",
    activeCard: "border-red-300 bg-red-50 shadow-sm",
    inactiveCard:
      "border-slate-200 bg-white hover:border-red-200 hover:bg-slate-50",
  },

  CANCELLED: {
    badge: "bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-100",
    activeCard: "border-slate-300 bg-slate-100 shadow-sm",
    inactiveCard:
      "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
  },
};
export function getBudgetStatusLabel(status) {
  return (
    BUDGET_STATUS_LABELS[status] ||
    formatStatus(status) ||
    "Unknown"
  );
}
export function getBudgetStatusStyle(status) {
  return (
    BUDGET_STATUS_STYLES[status] || {
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      activeCard: "border-slate-300 bg-slate-100 shadow-sm",
      inactiveCard:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
    }
  );
}
export const FINANCIAL_YEAR_STATUS_LABELS = {
  OPEN: "Open",
  PRE_CLOSING: "Pre Closing",
  CLOSED: "Closed",
};

export const FINANCIAL_YEAR_STATUS_STYLES = {
  OPEN: {
    badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100/60",
  },

  PRE_CLOSING: {
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100/60",
  },

  CLOSED: {
    badge: "bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-100",
  },
};


export function getFinancialYearStatusLabel(status) {
  return (
    FINANCIAL_YEAR_STATUS_LABELS[status] ||
    formatStatus(status) ||
    "Unknown"
  );
}

export function getFinancialYearStatusStyle(status) {
  return (
    FINANCIAL_YEAR_STATUS_STYLES[status] || {
      badge: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
}
