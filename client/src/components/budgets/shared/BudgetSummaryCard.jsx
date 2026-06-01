export default function BudgetSummaryCard({ label, value, blue = false }) {
  return (
    <div className="border-r border-slate-200 p-5 text-center last:border-r-0">
      <p className="text-sm font-semibold text-slate-500">{label}</p>

      <p
        className={`mt-3 text-2xl font-bold ${
          blue ? "text-blue-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
