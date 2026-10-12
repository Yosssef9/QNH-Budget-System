import {
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  Send,
} from "lucide-react";

const STAGES = [
  {
    key: "departments",
    label: "Department Reviews",
    description: "Review submitted department requests",
    icon: ClipboardCheck,
  },
  {
    key: "package",
    label: "Package Preparation",
    description: "Build models, prices and allocations",
    icon: PackageCheck,
  },
  {
    key: "submit",
    label: "Submit",
    description: "Check readiness and send to Purchasing",
    icon: Send,
  },
];

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function CategoryReviewWorkflowTabs({
  value,
  onChange,
  meta = {},
  disabledStages = [],
}) {
  const disabledSet = new Set(disabledStages);

  function handleKeyDown(event, currentIndex) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const enabledIndexes = STAGES.map((stage, index) =>
      disabledSet.has(stage.key) ? null : index,
    ).filter((index) => index !== null);

    if (!enabledIndexes.length) return;

    let nextIndex = currentIndex;

    if (event.key === "Home") {
      nextIndex = enabledIndexes[0];
    } else if (event.key === "End") {
      nextIndex = enabledIndexes[enabledIndexes.length - 1];
    } else {
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const currentEnabledIndex = Math.max(
        0,
        enabledIndexes.indexOf(currentIndex),
      );
      const nextEnabledPosition =
        (currentEnabledIndex + direction + enabledIndexes.length) %
        enabledIndexes.length;
      nextIndex = enabledIndexes[nextEnabledPosition];
    }

    const nextStage = STAGES[nextIndex];
    onChange(nextStage.key);
    window.requestAnimationFrame(() => {
      document.getElementById(`category-workflow-tab-${nextStage.key}`)?.focus();
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Category Manager workflow"
      className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-3"
    >
      {STAGES.map((stage, index) => {
        const active = value === stage.key;
        const disabled = disabledSet.has(stage.key);
        const Icon = stage.icon;
        const stageMeta = meta[stage.key] || {};

        return (
          <button
            id={`category-workflow-tab-${stage.key}`}
            key={stage.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`category-workflow-panel-${stage.key}`}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(stage.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={classNames(
              "group relative flex min-h-[92px] items-center gap-3 border-b px-4 py-4 text-left transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 lg:border-b-0 lg:border-r lg:last:border-r-0",
              active
                ? "bg-blue-50/80"
                : "bg-white hover:bg-slate-50",
              disabled && "cursor-not-allowed opacity-45 hover:bg-white",
            )}
          >
            <span
              className={classNames(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                active
                  ? "border-blue-200 bg-blue-600 text-white"
                  : stageMeta.complete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-500",
              )}
            >
              {stageMeta.complete && !active ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={classNames(
                    "text-sm font-black",
                    active ? "text-blue-950" : "text-slate-900",
                  )}
                >
                  {index + 1}. {stage.label}
                </span>
                {stageMeta.badge ? (
                  <span
                    className={classNames(
                      "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                      stageMeta.tone === "danger"
                        ? "bg-rose-100 text-rose-700"
                        : stageMeta.tone === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : stageMeta.tone === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {stageMeta.badge}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {disabled
                  ? "Your current workspace does not have access to this stage."
                  : stage.description}
              </span>
            </span>

            {active ? (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-blue-600" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
