import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  FileEdit,
  RotateCcw,
  Send,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { getBudgetTimeline } from "../api/budget.api";
import { formatDateTime } from "../utils/dateFormatters";
const actionConfig = {
  CREATE_BUDGET: {
    icon: FileEdit,
    color: "bg-slate-500",
    label: "Budget Initialized",
    showDescription: false,
  },

  SAVE_BUDGET: {
    icon: FileEdit,
    color: "bg-slate-400",
    label: "Draft Updated",
    showDescription: false,
  },

  SAVE_BUDGET_DRAFT: {
    icon: FileEdit,
    color: "bg-slate-400",
    label: "Draft Updated",
    showDescription: false,
  },

  SUBMIT_BUDGET: {
    icon: Send,
    color: "bg-indigo-500",
    label: "Submitted For Approval",
    showDescription: false,
  },

  RETURN_BUDGET: {
    icon: RotateCcw,
    color: "bg-amber-500",
    label: "Returned For Revision",
    showDescription: true,
  },

  APPROVE_BUDGET: {
    icon: CheckCircle2,
    color: "bg-emerald-500",
    label: "Budget Approved",
    showDescription: true,
  },
};

export default function BudgetTimeline({ budgetId, onToggle }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["budget-timeline", budgetId],
    queryFn: () => getBudgetTimeline(budgetId),
    enabled: Boolean(budgetId),
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />

          <p className="text-sm font-medium text-slate-500">
            Loading timeline...
          </p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Clock3 size={24} className="text-slate-400" />
          </div>

          <h3 className="text-base font-bold text-slate-800">
            No Timeline Activity
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Budget workflow actions will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Activity Timeline
          </h3>

          <p className="mt-1 text-xs text-slate-500">Budget workflow history</p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="
      rounded-xl border border-slate-200
      bg-white p-2 transition
      hover:bg-slate-50
    "
        >
          <PanelRightClose size={18} className="text-slate-500" />
        </button>
      </div>

      <div className="h-[calc(100vh-220px)] overflow-y-auto pr-2 space-y-6">
        {data.map((item, index) => {
          const config =
            actionConfig[item.action] || actionConfig.CREATE_BUDGET;

          const Icon = config.icon;

          return (
            <div key={item.id} className="relative flex gap-4">
              {index !== data.length - 1 && (
                <div className="absolute left-4 top-10 h-full w-[2px] bg-slate-200" />
              )}

              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${config.color}`}
              >
                <Icon size={15} />
              </div>

              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-slate-800">
                    {config.label}
                  </p>

                  <p className="text-xs text-slate-500">
                    {item.user_name || "Unknown User"}
                    {item.user_code ? ` (${item.user_code})` : ""}
                  </p>

                  <p className="text-xs text-slate-400">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>

                {config.showDescription && item.description && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
