import {
  AlertTriangle,
  ClipboardList,
  MessageSquareWarning,
  MousePointerClick,
} from "lucide-react";
import CollapsibleSection from "../CollapsibleSection";
import { useBudgetReviewFeedback } from "../../hooks/budgets/useBudgetReviewFeedback";
import { formatDateTime } from "../../utils/dateFormatters";

export default function BudgetReviewFeedback({ budgetId, onItemNoteClick }) {
  const { data, isLoading, isError } = useBudgetReviewFeedback(budgetId);

  const generalNotes = data?.generalNotes || [];
  const itemNotes = data?.itemNotes || [];

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-700">
        Loading review feedback...
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
        Failed to load review feedback.
      </section>
    );
  }

  if (generalNotes.length === 0 && itemNotes.length === 0) return null;

  return (
    <CollapsibleSection
      title="Approval Review Feedback"
      description={`${generalNotes.length} general note(s), ${itemNotes.length} item note(s). Click item notes to jump to the related row.`}
      icon={<MessageSquareWarning size={24} />}
      defaultOpen={false}
      className="border-amber-200 bg-amber-50"
      headerClassName="bg-amber-50"
      titleClassName="text-amber-900"
      descriptionClassName="text-amber-800"
      iconClassName="bg-white text-amber-700"
      badgeClassName="bg-white text-amber-700"
      bodyClassName="space-y-5 border-amber-200 bg-amber-50"
    >
      {generalNotes.length > 0 && (
        <CollapsibleSection
          title="General Return Notes"
          icon={<ClipboardList size={16} />}
          defaultOpen={false}
          className="bg-white"
          bodyClassName="space-y-3"
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
          bodyClassName="p-4"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {itemNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onItemNoteClick?.(note.budget_item_id)}
                className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100"
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
