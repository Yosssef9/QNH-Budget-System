import Breadcrumbs from "../components/Breadcrumbs";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-2 text-sm text-slate-500">
          View budget reports, transfer reports, variance reports, and usage
          summaries.
        </p>
      </section>
    </div>
  );
}
