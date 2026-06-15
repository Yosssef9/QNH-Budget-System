import { CheckCircle2, Clock3, FileText, PackageSearch } from "lucide-react";

import DashboardStatCard from "../dashboard/DashboardStatCard";

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

export default function POSummaryCards({ availablePOs = [], myLinks = [] }) {
  const pendingLinks = myLinks.filter((item) => item.status === "PENDING");
  const approvedLinks = myLinks.filter((item) => item.status === "APPROVED");
  const rejectedLinks = myLinks.filter((item) => item.status === "REJECTED");

  const totalAvailableQty = availablePOs.reduce(
    (sum, item) => sum + toNumber(item.available_qty),
    0,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        item={{
          title: "Available PO Records",
          value: availablePOs.length,
          description: `${totalAvailableQty} available quantity`,
          icon: PackageSearch,
        }}
      />

      <DashboardStatCard
        item={{
          title: "Pending Requests",
          value: pendingLinks.length,
          description: "Waiting for purchasing approval",
          icon: Clock3,
          highlight: pendingLinks.length > 0 ? "pending" : undefined,
        }}
      />

      <DashboardStatCard
        item={{
          title: "Approved Requests",
          value: approvedLinks.length,
          description: "Linked to budget items",
          icon: CheckCircle2,
        }}
      />

      <DashboardStatCard
        item={{
          title: "Rejected Requests",
          value: rejectedLinks.length,
          description: "Can be recreated later",
          icon: FileText,
        }}
      />
    </div>
  );
}
