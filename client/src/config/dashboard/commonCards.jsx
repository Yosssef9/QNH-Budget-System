import React from "react";
import { CalendarDays } from "lucide-react";

import {
  getFinancialYearStatusLabel,
  getFinancialYearStatusStyle,
} from "../../theme/statusStyles";

export function createFinancialYearCard(activeYear) {
  return {
    show: true,
    title: "Active Financial Year",
    value: (
      <div className="flex flex-col">
        <span className="text-2xl font-bold">{activeYear?.year || "-"}</span>

        <span
          className={`mt-2 inline-flex w-fit rounded-xl border px-2 py-1 text-xs font-semibold ${
            getFinancialYearStatusStyle(activeYear?.status).badge
          }`}
        >
          {getFinancialYearStatusLabel(activeYear?.status)}
        </span>
      </div>
    ),
    description: activeYear?.status
      ? getFinancialYearStatusLabel(activeYear.status)
      : "No active financial year",
    icon: CalendarDays,
  };
}
