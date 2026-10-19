import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Layers3,
  Lock,
  PackageCheck,
  Send,
  ShieldCheck,
} from "lucide-react";

import ConfirmModal from "../ConfirmModal";
import { useCategoryBackOverlay } from "./CategoryBackNavigation";
import CurrencyText from "../CurrencyText";
import { submitCategoryPackageToPurchasing } from "../../api/categoryPackages.api";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "—";
}

function formatStatus(value) {
  return String(value || "UNKNOWN").replaceAll("_", " ");
}

function SummaryCard({ icon: Icon, label, value, helper, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <span
        className={classNames(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tones[tone] || tones.slate,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 text-xl font-black text-slate-950">{value}</div>
        {helper ? <p className="mt-0.5 text-xs font-semibold text-slate-500">{helper}</p> : null}
      </div>
    </div>
  );
}

function ChecklistRow({ icon: Icon, label, detail, complete, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={classNames(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            complete ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
          )}
        >
          {complete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{label}</p>
          {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
        <span
          className={classNames(
            "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
            complete
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          {complete ? "Complete" : "Incomplete"}
        </span>
        {action}
      </div>
    </div>
  );
}

function blockerTone(code) {
  if (code === "SUBMISSION_WINDOW_OPEN") return "amber";
  if (code === "FINANCIAL_YEAR_NOT_OPEN") return "rose";
  return "rose";
}

export default function CategoryPackageSubmissionStage({
  packageData,
  loading,
  error,
  onRetry,
  canSubmit,
  canControlSubmissionWindow,
  onCloseSubmissionWindow,
  windowMutationPending,
  onResolveBlocker,
}) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  useCategoryBackOverlay(confirmOpen, () => setConfirmOpen(false));

  const blockers = packageData?.readiness?.blockers || [];
  const ready = Boolean(packageData?.readiness?.ready);
  const items = packageData?.items || [];
  const packageEditable = ["DRAFT", "RETURNED_BY_CFO"].includes(packageData?.status);
  const canSubmitNow = canSubmit && ready && packageEditable;

  const coverage = packageData?.summary?.departmentCoverage || {};
  const submittedDepartments = Number(coverage.submittedDepartments || 0);
  const completedDepartments = Number(coverage.completedDepartments || 0);
  const totalDepartments = Number(coverage.totalDepartments || 0);
  const reconciledItems = items.filter(
    (item) => item.reconciliation_status === "RECONCILED",
  );

  const blockerCodes = useMemo(
    () => new Set(blockers.map((blocker) => blocker.code)),
    [blockers],
  );

  const checklist = [
    {
      icon: Clock3,
      label: "Financial Year is OPEN",
      detail: "Package submission is only allowed while the financial year is open.",
      complete: packageData?.financial_year_status === "OPEN",
    },
    {
      icon: Lock,
      label: "Submission Window is CLOSED",
      detail: "Close the category submission window before handing the package to Purchasing.",
      complete: packageData?.submission_window?.status === "CLOSED",
      action:
        packageData?.submission_window?.status !== "CLOSED" &&
        canControlSubmissionWindow ? (
          <button
            type="button"
            disabled={windowMutationPending}
            onClick={onCloseSubmissionWindow}
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            Close now
          </button>
        ) : null,
    },
    {
      icon: Building2,
      label: "Approved demand comes from reviewed departments",
      detail: "Package demand must be backed by completed department review rows.",
      complete: !blockerCodes.has("NO_REVIEWED_DEMAND"),
    },
    {
      icon: PackageCheck,
      label: "Approved demand has package models",
      detail: "Every package item with approved demand must have at least one model.",
      complete: !blockerCodes.has("PACKAGE_ITEM_HAS_NO_MODELS"),
    },
    {
      icon: Layers3,
      label: "Package and department allocations reconcile",
      detail: "Approved quantities, model quantities and department allocations must balance exactly.",
      complete: ![
        "ITEM_NOT_RECONCILED",
        "DEPARTMENT_ALLOCATION_SHORT",
        "DEPARTMENT_ALLOCATION_EXCESS",
        "PACKAGE_SUB_ITEM_QUANTITY_MISMATCH",
      ].some((code) => blockerCodes.has(code)),
    },
    {
      icon: CircleDollarSign,
      label: "Category Manager proposed prices entered",
      detail: "Every configured package model must have a Category Manager price of at least 1.",
      complete: !blockerCodes.has("PACKAGE_SUB_ITEM_PRICE_REQUIRED"),
    },
  ];

  const submitMutation = useMutation({
    mutationFn: submitCategoryPackageToPurchasing,
    onSuccess: async () => {
      toast.success("Category package submitted to Purchasing");
      setConfirmOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["category-packages"] }),
        queryClient.invalidateQueries({ queryKey: ["category-review"] }),
      ]);
    },
    onError: (mutationError) => {
      toast.error(
        mutationError?.response?.data?.message ||
          "Failed to submit package to Purchasing",
      );
    },
  });

  if (loading) {
    return (
      <div
        id="category-workflow-panel-submit"
        role="tabpanel"
        aria-labelledby="category-workflow-tab-submit"
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-[520px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !packageData) {
    return (
      <div
        id="category-workflow-panel-submit"
        role="tabpanel"
        aria-labelledby="category-workflow-tab-submit"
        className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-black">Could not load submission readiness</p>
            <p className="mt-1 text-sm">
              {error?.response?.data?.message || "Refresh and try again."}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const estimatedPackageTotal = items.reduce(
    (sum, item) =>
      sum + Number(item.category_manager_estimated_total ?? item.estimated_total ?? 0),
    0,
  );

  return (
    <div
      id="category-workflow-panel-submit"
      role="tabpanel"
      aria-labelledby="category-workflow-tab-submit"
      tabIndex={0}
      className="space-y-4 focus:outline-none"
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={PackageCheck}
          label="Package Status"
          value={formatStatus(packageData.status)}
          helper={`FY ${packageData.financial_year}`}
          tone="blue"
        />
        <SummaryCard
          icon={Building2}
          label="Reviewed Departments"
          value={`${completedDepartments} / ${submittedDepartments || 0}`}
          helper={`${totalDepartments} total departments`}
          tone={submittedDepartments > 0 && completedDepartments === submittedDepartments ? "emerald" : "amber"}
        />
        <SummaryCard
          icon={Layers3}
          label="Reconciled Items"
          value={`${reconciledItems.length} / ${items.length}`}
          helper={`${formatNumber(packageData.summary?.approvedQuantity)} approved qty`}
          tone={reconciledItems.length === items.length && items.length > 0 ? "emerald" : "amber"}
        />
        <SummaryCard
          icon={ready ? ShieldCheck : AlertCircle}
          label="Submission Readiness"
          value={ready ? "Ready" : "Not Ready"}
          helper={ready ? "All backend checks passed" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`}
          tone={ready ? "emerald" : "rose"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_390px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">Readiness Checklist</h2>
            <p className="mt-1 text-sm text-slate-500">
              These checks mirror the package validation used by the current backend submission flow.
            </p>
          </div>
          {checklist.map((row) => (
            <ChecklistRow key={row.label} {...row} />
          ))}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span
              className={classNames(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                ready ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
              )}
            >
              {ready ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Submission Action
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950">
                {packageData.status === "IN_PURCHASING_REVIEW"
                  ? "Already in Purchasing Review"
                  : packageData.status === "IN_CFO_REVIEW"
                    ? "Already in CFO Review"
                    : packageData.status === "CFO_REVIEW_COMPLETED"
                      ? "CFO Review Completed"
                      : ready
                        ? "Ready for Purchasing"
                        : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} remaining`}
              </h2>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
              Estimated Package Value
            </p>
            <div className="mt-1 text-2xl font-black text-slate-950">
              <CurrencyText value={estimatedPackageTotal} />
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Based on Category Manager model prices and current allocations.
            </p>
          </div>

          <button
            type="button"
            disabled={!canSubmitNow || submitMutation.isPending}
            onClick={() => setConfirmOpen(true)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" />
            Submit to Purchasing
          </button>

          {!canSubmit ? (
            <p className="mt-3 text-center text-xs font-semibold text-amber-700">
              Your current workspace does not have permission to submit category packages.
            </p>
          ) : !packageEditable ? (
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">
              This package has already moved beyond Category Manager editing.
            </p>
          ) : !ready ? (
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">
              Resolve every blocker before submission is enabled.
            </p>
          ) : null}

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            <span>The backend rechecks package readiness inside the submit transaction.</span>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Blockers</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open the affected package item directly from here.
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
              {blockers.length}
            </span>
          </div>

          {blockers.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center p-6 text-center">
              <div>
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                <p className="mt-2 font-black text-slate-900">No blockers found</p>
                <p className="mt-1 text-sm text-slate-500">The package passes the current readiness checks.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {blockers.map((blocker, index) => {
                const tone = blockerTone(blocker.code);
                const canResolveItem = Boolean(blocker.packageItemId);
                const canCloseWindow =
                  blocker.code === "SUBMISSION_WINDOW_OPEN" &&
                  canControlSubmissionWindow;

                return (
                  <div
                    key={`${blocker.code}-${blocker.packageItemId || "package"}-${index}`}
                    className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={classNames(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          tone === "amber"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700",
                        )}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          {formatStatus(blocker.code)}
                        </p>
                        <p className="mt-1 text-sm font-bold leading-6 text-slate-900">
                          {blocker.message}
                        </p>
                      </div>
                    </div>

                    {canResolveItem ? (
                      <button
                        type="button"
                        onClick={() => onResolveBlocker(blocker)}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                      >
                        Resolve in Package Preparation
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : canCloseWindow ? (
                      <button
                        type="button"
                        onClick={onCloseSubmissionWindow}
                        disabled={windowMutationPending}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <Lock className="h-3.5 w-3.5" /> Close Submissions
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Ready Items</h2>
              <p className="mt-1 text-sm text-slate-500">
                Package items currently reconciled.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
              {reconciledItems.length}
            </span>
          </div>
          {reconciledItems.length ? (
            <div className="divide-y divide-slate-100">
              {reconciledItems.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                      {item.catalog_item_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatNumber(item.approved_quantity)} approved · {item.department_count} department{Number(item.department_count) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-slate-500">
              No reconciled package items yet.
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Submit Category Package to Purchasing?"
        message={`Submit the ${packageData.category_name} package for Purchasing price review? Package models, Category Manager prices, specifications, attachments, and allocations will become read-only while Purchasing reviews the package.`}
        confirmText="Submit to Purchasing"
        cancelText="Review Again"
        loading={submitMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() =>
          submitMutation.mutate({
            packageId: packageData.id,
            payload: { row_version: packageData.row_version },
          })
        }
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase text-blue-700">Package</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {packageData.category_name} · FY {packageData.financial_year}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-500">Estimated Value</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              <CurrencyText value={estimatedPackageTotal} />
            </p>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}

