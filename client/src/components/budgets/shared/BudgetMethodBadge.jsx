export function getMethodBase(method) {
  if (method === "CUSTOM_MONTHLY" || method === "CUSTOM_QUARTERLY") {
    return "CUSTOM";
  }

  return method;
}

export default function BudgetMethodBadge({ method, level }) {
  const base = getMethodBase(method);

  const styles = {
    MONTHLY: "bg-blue-50 text-blue-700 border-blue-100",
    QUARTERLY: "bg-emerald-50 text-emerald-700 border-emerald-100",
    CUSTOM: "bg-orange-50 text-orange-700 border-orange-100",
    ANNUAL: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <div className="text-center">
      <span
        className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${
          styles[base] || "bg-slate-50 text-slate-700 border-slate-100"
        }`}
      >
        {base || "N/A"}
      </span>

      {level && (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          ({level})
        </p>
      )}
    </div>
  );
}
