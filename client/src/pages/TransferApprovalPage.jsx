import Breadcrumbs from "../components/Breadcrumbs";

export default function TransferApprovalPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Transfer Approvals</h1>

        <p className="mt-2 text-sm text-slate-500">
          Review and approve pending transfer requests.
        </p>
      </div>
    </div>
  );
}
