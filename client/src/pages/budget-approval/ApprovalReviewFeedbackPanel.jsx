import {
  AlertTriangle,
  ClipboardList,
  History,
  MousePointerClick,
} from "lucide-react";
import CollapsibleSection from "../../components/CollapsibleSection";
import { useBudgetReviewFeedback } from "../../hooks/budgets/useBudgetReviewFeedback";
import { formatDateTime } from "../../utils/dateFormatters";

export default function ApprovalReviewFeedbackPanel({
  budgetId,
  onItemNoteClick,
}) {
  const { data, isLoading, isError } = useBudgetReviewFeedback(budgetId);

  const generalNotes = data?.generalNotes || [];
  const itemNotes = data?.itemNotes || [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
        Loading previous review notes...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        Failed to load previous review notes.
      </div>
    );
  }

  if (generalNotes.length === 0 && itemNotes.length === 0) return null;

  return (
    <CollapsibleSection
      title="Previous Review Notes"
      description="Compare previous approver notes with the current submitted budget."
      icon={<History size={23} />}
      defaultOpen={false}
      className="border-amber-200 bg-amber-50"
      headerClassName="bg-amber-50"
      titleClassName="text-amber-900"
      descriptionClassName="text-amber-800"
      iconClassName="bg-white text-amber-700"
      badgeClassName="bg-white text-amber-700"
      bodyClassName="space-y-4 border-amber-200 bg-amber-50"
    >
      {generalNotes.length > 0 && (
        <CollapsibleSection
          title="General Notes"
          icon={<ClipboardList size={16} />}
          defaultOpen={false}
          className="bg-white"
          badgeClassName="bg-slate-50"
          bodyClassName="space-y-3"
          action={
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {generalNotes.length}
            </span>
          }
        >
          {generalNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-amber-100 bg-amber-50/60 p-3"
            >
              <p className="text-sm font-semibold text-slate-800">
                {note.note}
              </p>

              <p className="mt-2 text-xs font-medium text-slate-500">
                By {note.created_by_name || "Approver"} ·{" "}
                {note.created_at ? formatDateTime(note.created_at) : ""}
              </p>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {itemNotes.length > 0 && (
        <CollapsibleSection
          title="Item Notes"
          icon={<AlertTriangle size={16} />}
          defaultOpen={false}
          className="bg-white"
          badgeClassName="bg-slate-50"
          bodyClassName="p-4"
          action={
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {itemNotes.length}
            </span>
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {itemNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onItemNoteClick?.(note.budget_item_id)}
                className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left transition-all duration-200 hover:border-amber-300 hover:bg-amber-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      {note.category_name || "Category"}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {note.type_name || "Budget Item"}
                    </p>
                  </div>

                  <MousePointerClick
                    size={16}
                    className="shrink-0 text-amber-700"
                  />
                </div>

                <p className="mt-3 text-sm font-semibold text-red-700">
                  {note.note}
                </p>

                <p className="mt-3 text-xs font-medium text-slate-500">
                  By {note.created_by_name || "Approver"} ·{" "}
                  {note.created_at ? formatDateTime(note.created_at) : ""}
                </p>
              </button>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </CollapsibleSection>
  );
}
