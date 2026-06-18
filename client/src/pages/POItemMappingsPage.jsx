import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Link2,
  Plus,
  Power,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import ConfirmModal from "../components/ConfirmModal";
import EnterpriseSearch from "../components/EnterpriseSearch";
import Input from "../components/Input";
import CollapsiblePanelToggle from "../components/layout/CollapsiblePanelToggle";
import PageLoader from "../components/PageLoader";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import SortableHeader from "../components/SortableHeader";
import TablePagination from "../components/TablePagination";
import {
  useCreatePOItemMapping,
  usePOItemMappingBudgetTypes,
  usePOItemMappings,
  usePOItemsForMapping,
  useUpdatePOItemMappingStatus,
} from "../hooks/po-item-mappings/usePOItemMappings";
import usePagination from "../hooks/usePagination";
import useTableSort from "../hooks/useTableSort";
import { formatDateTime } from "../utils/dateFormatters";

const emptyForm = {
  budget_type_id: "",
  po_item_code: "",
  po_item_description: "",
};

const sourceFilters = [
  { value: "ALL", label: "All Sources" },
  { value: "MANUAL", label: "Manual" },
  { value: "APPROVED_LINK", label: "Learned" },
];

const statusFilters = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const statStyles = {
  total: {
    card: "border-blue-200 bg-blue-50/60",
    icon: "bg-white text-blue-700 ring-blue-100",
    label: "text-blue-700",
    value: "text-blue-950",
    marker: "bg-blue-500",
  },
  active: {
    card: "border-emerald-200 bg-emerald-50/70",
    icon: "bg-white text-emerald-700 ring-emerald-100",
    label: "text-emerald-700",
    value: "text-emerald-950",
    marker: "bg-emerald-500",
  },
  manual: {
    card: "border-indigo-200 bg-indigo-50/60",
    icon: "bg-white text-indigo-700 ring-indigo-100",
    label: "text-indigo-700",
    value: "text-indigo-950",
    marker: "bg-indigo-500",
  },
  learned: {
    card: "border-amber-200 bg-amber-50/70",
    icon: "bg-white text-amber-700 ring-amber-100",
    label: "text-amber-700",
    value: "text-amber-950",
    marker: "bg-amber-500",
  },
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function SourceBadge({ source }) {
  const manual = source === "MANUAL";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        manual
          ? "border-indigo-100 bg-indigo-50 text-indigo-700"
          : "border-amber-100 bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {manual ? "Manual" : "Learned"}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
        active
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, variant = "total" }) {
  const styles = statStyles[variant] || statStyles.total;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card",
        styles.card,
      ].join(" ")}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${styles.marker}`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={[
              "text-xs font-bold uppercase tracking-[0.14em]",
              styles.label,
            ].join(" ")}
          >
            {label}
          </p>

          <p
            className={[
              "mt-3 text-3xl font-bold tracking-tight",
              styles.value,
            ].join(" ")}
          >
            {value}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1",
            styles.icon,
          ].join(" ")}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function FilterSegment({ label, options, value, onChange, tone = "blue" }) {
  const activeClasses =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-600 text-white shadow-sm"
      : "border-blue-200 bg-blue-600 text-white shadow-sm";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const active = value === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={[
                "rounded-xl border px-3 py-2 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-50",
                active
                  ? activeClasses
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function POItemMappingsPage() {
  const [filters, setFilters] = useState({
    search: "",
    source: "ALL",
    status: "ALL",
  });
  const [form, setForm] = useState(emptyForm);
  const [budgetTypeSearch, setBudgetTypeSearch] = useState("");
  const [poItemSearch, setPOItemSearch] = useState("");
  const [statusTarget, setStatusTarget] = useState(null);
  const [disabledReason, setDisabledReason] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  const mappingsQuery = usePOItemMappings(filters);
  const budgetTypesQuery = usePOItemMappingBudgetTypes({
    search: budgetTypeSearch || undefined,
  });
  const poItemsQuery = usePOItemsForMapping({
    search: poItemSearch || undefined,
  });
  const createMutation = useCreatePOItemMapping();
  const statusMutation = useUpdatePOItemMappingStatus();

  const mappings = mappingsQuery.data || [];
  const budgetTypes = budgetTypesQuery.data || [];
  const poItems = poItemsQuery.data || [];

  const selectedBudgetType = useMemo(() => {
    if (!form.budget_type_id) return [];

    const found = budgetTypes.find(
      (item) => Number(item.id) === Number(form.budget_type_id),
    );

    return found ? [found] : [];
  }, [budgetTypes, form.budget_type_id]);

  const selectedPOItem = useMemo(() => {
    if (!form.po_item_code) return [];

    const found = poItems.find(
      (item) => item.po_item_code === form.po_item_code,
    );

    return found
      ? [found]
      : [
          {
            po_item_code: form.po_item_code,
            po_item_description: form.po_item_description,
          },
        ];
  }, [form.po_item_code, form.po_item_description, poItems]);

  const budgetTypeOptions = useMemo(() => {
    return [
      ...selectedBudgetType,
      ...budgetTypes.filter(
        (item) => Number(item.id) !== Number(form.budget_type_id),
      ),
    ];
  }, [budgetTypes, form.budget_type_id, selectedBudgetType]);

  const poItemOptions = useMemo(() => {
    return [
      ...selectedPOItem,
      ...poItems.filter((item) => item.po_item_code !== form.po_item_code),
    ];
  }, [form.po_item_code, poItems, selectedPOItem]);

  const stats = useMemo(() => {
    return {
      total: mappings.length,
      active: mappings.filter((item) => item.is_active).length,
      manual: mappings.filter((item) => item.mapping_source === "MANUAL")
        .length,
      learned: mappings.filter(
        (item) => item.mapping_source === "APPROVED_LINK",
      ).length,
    };
  }, [mappings]);

  const { sortedRows, sortColumn, sortDirection, handleSort } = useTableSort(
    mappings,
    "created_at",
    "desc",
  );

  const pagination = usePagination(sortedRows.length, 25);

  const paginatedMappings = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;

    return sortedRows.slice(start, end);
  }, [pagination.page, pagination.pageSize, sortedRows]);

  function updateFilters(nextFilters) {
    setFilters((prev) => ({
      ...prev,
      ...nextFilters,
    }));
    pagination.resetPage();
  }

  function resetForm() {
    setForm(emptyForm);
    setBudgetTypeSearch("");
    setPOItemSearch("");
  }

  function handleBudgetTypeChange(event) {
    setForm((prev) => ({
      ...prev,
      budget_type_id: event.target.value,
    }));
  }

  function handlePOItemChange(event) {
    const selected = poItemOptions.find(
      (item) => item.po_item_code === event.target.value,
    );

    setForm((prev) => ({
      ...prev,
      po_item_code: event.target.value,
      po_item_description: selected?.po_item_description || "",
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!form.budget_type_id || !form.po_item_code) {
      toast.error("Budget item type and PO item code are required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        budget_type_id: Number(form.budget_type_id),
        po_item_code: form.po_item_code,
        po_item_description: form.po_item_description || null,
      });

      toast.success("PO item mapping created");
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create PO item mapping"));
    }
  }

  function requestStatusChange(mapping) {
    setStatusTarget(mapping);
    setDisabledReason("");
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;

    const nextActive = !statusTarget.is_active;

    if (!nextActive && !disabledReason.trim()) {
      toast.error("Disable reason is required");
      return;
    }

    try {
      await statusMutation.mutateAsync({
        id: statusTarget.id,
        payload: {
          is_active: nextActive,
          disabled_reason: nextActive ? null : disabledReason,
        },
      });

      toast.success(
        nextActive ? "PO item mapping re-enabled" : "PO item mapping disabled",
      );
      setStatusTarget(null);
      setDisabledReason("");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to update PO item mapping status"),
      );
    }
  }

  if (mappingsQuery.isLoading) {
    return (
      <PageLoader
        title="Loading PO item mappings"
        description="Preparing mapping management data..."
      />
    );
  }

  return (
    <div className="min-w-0 space-y-6 font-sans">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-card">
        <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
              Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              PO Item Mappings
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Manage the source-of-truth mappings between budget item types and
              CareWare PO item codes. Manual and learned mappings are shown
              together for maintenance.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Mappings"
          value={stats.total}
          icon={Link2}
          variant="total"
        />
        <StatCard
          label="Active Mappings"
          value={stats.active}
          icon={Power}
          variant="active"
        />
        <StatCard
          label="Manual Mappings"
          value={stats.manual}
          icon={Plus}
          variant="manual"
        />
        <StatCard
          label="Learned Mappings"
          value={stats.learned}
          icon={RefreshCcw}
          variant="learned"
        />
      </section>

      <div
        className={[
          "grid items-start min-w-0 gap-6 transition-all duration-300 ease-in-out",
          isCreateOpen
            ? "xl:grid-cols-[460px_minmax(0,1fr)]"
            : "xl:grid-cols-[0px_minmax(0,1fr)]",
        ].join(" ")}
      >
        <form
          onSubmit={handleCreate}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
                  Manual Mapping
                </p>

                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
                  Create Mapping
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Bootstrap approved mappings before they are learned from PO
                  link approvals.
                </p>
              </div>

              <CollapsiblePanelToggle
                isOpen={isCreateOpen}
                onToggle={() => setIsCreateOpen((prev) => !prev)}
                openLabel="Show"
                closeLabel="Hide"
              />
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Budget Item Type
              </label>

              <SearchableMultiSelect
                multiple={false}
                value={form.budget_type_id}
                options={budgetTypeOptions}
                placeholder="Select budget item type"
                searchPlaceholder="Search budget item types..."
                noResultsText="No budget item types found"
                maxVisibleBadges={1}
                searchValue={budgetTypeSearch}
                onSearchChange={setBudgetTypeSearch}
                loading={budgetTypesQuery.isFetching}
                getOptionValue={(item) => item.id}
                getOptionLabel={(item) => item.name}
                onChange={handleBudgetTypeChange}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                PO Item Code
              </label>

              <SearchableMultiSelect
                multiple={false}
                value={form.po_item_code}
                options={poItemOptions}
                placeholder="Select PO item code"
                searchPlaceholder="Search PO item codes..."
                noResultsText="No PO item codes found"
                maxVisibleBadges={1}
                searchValue={poItemSearch}
                onSearchChange={setPOItemSearch}
                loading={poItemsQuery.isFetching}
                getOptionValue={(item) => item.po_item_code}
                getOptionLabel={(item) =>
                  `${item.po_item_code}${
                    item.po_item_description
                      ? ` - ${item.po_item_description}`
                      : ""
                  }`
                }
                onChange={handlePOItemChange}
              />
            </div>

            {form.po_item_code && (
              <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                <p className="text-xs font-bold uppercase text-primary-700">
                  Selected PO Item
                </p>
                <p className="mt-2 text-sm font-bold text-enterprise-text">
                  {form.po_item_code}
                </p>
                <p className="mt-1 text-sm text-enterprise-muted">
                  {form.po_item_description || "No description available"}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !form.budget_type_id ||
                !form.po_item_code
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />
              {createMutation.isPending ? "Creating..." : "Create Mapping"}
            </button>
          </div>
        </form>

        <motion.section
          layout
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card"
        >
          <div className="border-b border-slate-100 p-4">
            <CollapsiblePanelToggle
              isOpen={isCreateOpen}
              onToggle={() => setIsCreateOpen((prev) => !prev)}
              openLabel="Show Create Mapping"
              closeLabel="Hide Create Mapping"
            />
          </div>

          <div className="border-b border-slate-100 bg-white p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  Existing Mappings
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manual and learned mappings in one maintenance view.
                </p>
              </div>

              <div className="w-full xl:w-80">
                <EnterpriseSearch
                  value={filters.search}
                  onChange={(search) => updateFilters({ search })}
                  placeholder="Search mappings..."
                  size="sm"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Filters
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    Narrow mappings by source and active status.
                  </p>
                </div>

                <CollapsiblePanelToggle
                  isOpen={isFiltersOpen}
                  onToggle={() => setIsFiltersOpen((prev) => !prev)}
                  openLabel="Show"
                  closeLabel="Hide"
                />
              </div>

              {isFiltersOpen && (
                <div className="grid gap-3 p-4 lg:grid-cols-2">
                  <FilterSegment
                    label="Source"
                    options={sourceFilters}
                    value={filters.source}
                    onChange={(source) => updateFilters({ source })}
                    tone="blue"
                  />

                  <FilterSegment
                    label="Status"
                    options={statusFilters}
                    value={filters.status}
                    onChange={(status) => updateFilters({ status })}
                    tone="emerald"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="max-w-full overflow-x-auto bg-slate-50/40 p-4">
            <div className="max-h-[780px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    <SortableHeader
                      label="Budget Item Type"
                      column="budget_type_name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="PO Item Code"
                      column="po_item_code"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="PO Item Description"
                      column="po_item_description"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Mapping Source"
                      column="mapping_source"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Learning"
                      column="learned_count"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Created By"
                      column="created_by_name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Created At"
                      column="created_at"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Status"
                      column="is_active"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="border-b border-slate-200 px-5 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedMappings.map((mapping) => (
                    <tr
                      key={mapping.id}
                      className="text-slate-800 transition hover:bg-blue-50/40"
                    >
                      <td className="border-b border-slate-100 px-5 py-5">
                        <p className="font-bold text-slate-950">
                          {mapping.budget_type_name || "-"}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Type #{mapping.budget_type_id}
                        </p>
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <p className="font-mono text-sm font-bold text-slate-950">
                          {mapping.po_item_code}
                        </p>
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <p className="line-clamp-2 max-w-[320px] text-xs leading-5 text-slate-500">
                          {mapping.po_item_description || "-"}
                        </p>
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <SourceBadge source={mapping.mapping_source} />
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <p className="font-bold text-slate-900">
                          {mapping.learned_count || 0} time(s)
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Last: {formatDateTime(mapping.last_learned_at)}
                        </p>
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <p className="font-semibold text-slate-900">
                          {mapping.created_by_name || mapping.created_by || "-"}
                        </p>
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(mapping.created_at)}
                        </p>
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <StatusBadge active={Boolean(mapping.is_active)} />
                        {!mapping.is_active && mapping.disabled_reason && (
                          <p className="mt-2 line-clamp-2 max-w-[220px] text-xs leading-5 text-slate-500">
                            {mapping.disabled_reason}
                          </p>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-5 py-5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => requestStatusChange(mapping)}
                            disabled={statusMutation.isPending}
                            className={[
                              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                              mapping.is_active
                                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-50"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-50",
                            ].join(" ")}
                          >
                            <Power size={14} />
                            {mapping.is_active ? "Disable" : "Re-enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sortedRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-16 text-center text-sm text-slate-500"
                      >
                        <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                            <Search size={22} />
                          </div>
                          <p className="mt-4 text-base font-bold text-slate-800">
                            No mappings found.
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Adjust filters or create a manual mapping.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              startRow={pagination.startRow}
              endRow={pagination.endRow}
              totalRows={sortedRows.length}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        </motion.section>
      </div>

      <ConfirmModal
        open={Boolean(statusTarget)}
        title={
          statusTarget?.is_active
            ? "Disable PO Item Mapping"
            : "Re-enable PO Item Mapping"
        }
        message={
          statusTarget?.is_active
            ? "Inactive mappings remain visible in administration but are excluded from PO suggestions."
            : "This mapping will become active and will be used for PO suggestions."
        }
        confirmText={statusTarget?.is_active ? "Disable Mapping" : "Re-enable"}
        cancelText="Cancel"
        danger={Boolean(statusTarget?.is_active)}
        loading={statusMutation.isPending}
        onCancel={() => {
          setStatusTarget(null);
          setDisabledReason("");
        }}
        onConfirm={confirmStatusChange}
      >
        {statusTarget?.is_active && (
          <Input
            label="Disable Reason"
            multiline
            rows={3}
            value={disabledReason}
            onChange={(event) => setDisabledReason(event.target.value)}
            placeholder="Explain why this mapping is being disabled"
            required
          />
        )}
      </ConfirmModal>
    </div>
  );
}
