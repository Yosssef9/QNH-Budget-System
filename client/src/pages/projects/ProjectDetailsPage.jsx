import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import Breadcrumbs from "../../components/Breadcrumbs";
import CurrencyText from "../../components/CurrencyText";
import { useProjectDetails } from "../../hooks/projects/useProjects";
import { formatDateTime } from "../../utils/dateFormatters";
import {
  getBudgetStatusLabel,
  getBudgetStatusStyle,
  getFinancialYearStatusLabel,
  getFinancialYearStatusStyle,
} from "../../theme/statusStyles";

function DetailCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function ProjectDetailsPage() {
  const { budgetItemId } = useParams();
  const { data: project, isLoading } = useProjectDetails(budgetItemId);

  return (
    <div className="space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/" },
          { label: "Projects", path: "/projects" },
          { label: project?.project_name || "Project Details" },
        ]}
      />

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-card">
          Loading project details...
        </section>
      ) : !project ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-card">
          Project budget item not found.
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-enterprise-border bg-white p-6 shadow-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <BriefcaseBusiness size={24} />
                </span>

                <div>
                  <p className="text-sm font-semibold tracking-wide text-violet-700">
                    Project Budget Item
                  </p>

                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-enterprise-text">
                    {project.project_name}
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-enterprise-muted">
                    This page is reserved for future project tracking. For Phase
                    1, the project remains a budget item with elevated
                    visibility and reporting.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${
                    getBudgetStatusStyle(project.budget_status).badge
                  }`}
                >
                  {getBudgetStatusLabel(project.budget_status)}
                </span>
                <span
                  className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${
                    getFinancialYearStatusStyle(project.financial_year_status)
                      .badge
                  }`}
                >
                  {getFinancialYearStatusLabel(project.financial_year_status)}
                </span>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailCard label="Department" value={project.department_name} />
            <DetailCard
              label="Budget"
              value={
                <Link
                  to={`/budgets/view/${project.budget_id}`}
                  className="text-primary-700 hover:text-primary-800"
                >
                  Budget #{project.budget_id}
                </Link>
              }
            />
            <DetailCard label="Financial Year" value={project.financial_year} />
            <DetailCard
              label="Amount"
              value={<CurrencyText value={project.total_amount} />}
            />
            <DetailCard label="Category" value={project.category_name || "-"} />
            <DetailCard label="Quantity" value={project.quantity} />
            <DetailCard
              label="Unit Price"
              value={<CurrencyText value={project.unit_price} />}
            />
            <DetailCard
              label="Created"
              value={formatDateTime(project.created_at)}
            />
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Project Tracking Placeholder
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Future phases can add milestones, procurement tracking, risks,
              documents, timelines, and progress updates here without changing
              the Phase 1 business model.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
