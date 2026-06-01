import Breadcrumbs from "../components/Breadcrumbs";
import TransferForm from "../components/transfers/TransferForm";
import TransferTable from "../components/transfers/TransferTable";

export default function TransferPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Transfers</h1>

        <p className="mt-2 text-sm text-slate-500">
          Manage budget transfer requests and transfer approvals.
        </p>
      </section>

      <TransferForm />

      <TransferTable />
    </div>
  );
}
