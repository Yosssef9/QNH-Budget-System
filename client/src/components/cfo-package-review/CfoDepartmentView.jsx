import CfoReviewStatusBadge from "./CfoReviewStatusBadge";
import CurrencyText from "../CurrencyText";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getAllocationTotal(allocations = []) {
  return allocations.reduce(
    (sum, allocation) =>
      sum +
      toNumber(allocation.allocated_quantity) * toNumber(allocation.unit_price),
    0,
  );
}

function getDepartmentTotal(department) {
  return (department.items || []).reduce(
    (sum, item) => sum + getAllocationTotal(item.allocations),
    0,
  );
}

export default function CfoDepartmentView({ departments, onSelectPackageItem }) {
  if (!departments?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
        No department demand is available for this package.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {departments.map((department) => (
        <section
          key={department.department_id}
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  {department.department_name}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {department.department_code} · {department.item_count} items
                </p>
              </div>
              <CfoReviewStatusBadge status={department.reconciliation_status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm xl:grid-cols-4">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  Requested
                </div>
                <div className="font-bold">{department.requested_quantity}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  Approved
                </div>
                <div className="font-bold">{department.approved_quantity}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  Allocated
                </div>
                <div className="font-bold">{department.allocated_quantity}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  Department total
                </div>
                <div className="font-bold">
                  <CurrencyText compact value={getDepartmentTotal(department)} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3">
            {department.items.map((item) => (
              <button
                key={item.department_item_id}
                type="button"
                onClick={() => onSelectPackageItem(item.package_item_id)}
                className="mb-2 w-full rounded-xl border border-slate-200 p-4 text-left hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">
                      {item.catalog_item_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Requested {item.requested_quantity} · Approved{" "}
                      {item.approved_quantity} · Allocated{" "}
                      {item.allocated_quantity}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-700">
                      Item total:{" "}
                      <CurrencyText
                        compact
                        value={getAllocationTotal(item.allocations)}
                      />
                    </div>
                  </div>
                  <CfoReviewStatusBadge status={item.reconciliation_status} />
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  {(item.allocations || []).length
                    ? item.allocations
                        .map((allocation) => (
                          <span key={allocation.id} className="mr-3">
                            {allocation.package_sub_item_name}:{" "}
                            {allocation.allocated_quantity} (
                            <CurrencyText compact value={allocation.unit_price} />)
                          </span>
                        ))
                    : "No split configured"}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
