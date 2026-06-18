import { useMemo, useState } from "react";
import {
  Plus,
  RefreshCcw,
  Save,
  X,
  ShieldCheck,
  UserCog,
  Power,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from "lucide-react";
import PageLoader from "../components/PageLoader";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import ConfirmModal from "../components/ConfirmModal";
import { AnimatePresence, motion } from "framer-motion";
import {
  useBudgetAccessAssignments,
  useCreateBudgetAccessAssignment,
  useUpdateBudgetAccessAssignment,
  useToggleBudgetAccessAssignmentStatus,
  useDeleteBudgetAccessAssignment,
} from "../hooks/budget-access/useBudgetAccessAssignments";
import CollapsiblePanelToggle from "../components/layout/CollapsiblePanelToggle";
import { useBudgetAccessUsers } from "../hooks/budget-access/useBudgetAccessUsers";
import { useBudgetAccessDepartments } from "../hooks/budget-access/useBudgetAccessDepartments";
import { useBudgetAccessRoles } from "../hooks/budget-access/useBudgetAccessRoles";
import toast from "react-hot-toast";
const permissionFields = [
  { key: "can_view_budget", label: "View Budget" },
  { key: "can_edit_budget", label: "Edit Budget" },
  { key: "can_view_po_links", label: "View his department PO Links" },
  { key: "can_request_po_links", label: "Request PO Links" },
  { key: "can_view_all_po_link_requests", label: "View All PO Link Requests" },
  { key: "can_approve_po_links", label: "Approve PO Links" },
  { key: "can_request_transfer", label: "Request Transfer" },
  { key: "can_approve_budget", label: "Approve Budget" },
  { key: "can_approve_transfer", label: "Approve Transfer" },
  { key: "can_manage_users", label: "Manage Users" },
  { key: "can_manage_categories", label: "Manage Categories" },
  { key: "can_manage_po_item_mappings", label: "Manage PO Item Mappings" },
  { key: "can_view_reports", label: "View Reports" },
];

const permissionOptions = [
  { id: "", name: "Inherit from role" },
  { id: "1", name: "Allow" },
];

const emptyForm = {
  id: null,
  user_id: null,
  user_code: "",
  user_name: "",
  department_id: null,
  role_id: null,
  can_view_budget: "",
  can_edit_budget: "",
  can_view_po_links: "",
  can_request_po_links: "",
  can_view_all_po_link_requests: "",
  can_approve_po_links: "",
  can_request_transfer: "",
  can_approve_budget: "",
  can_approve_transfer: "",
  can_manage_users: "",
  can_manage_categories: "",
  can_manage_po_item_mappings: "",
  can_view_reports: "",
};

function normalizePermissionValue(value) {
  if (value === "" || value == null) {
    return null;
  }

  if (value === "1") {
    return true;
  }

  return null;
}

function buildPayload(form) {
  const payload = {
    user_id: Number(form.user_id),
    department_id: form.department_id ? Number(form.department_id) : null,
    role_id: Number(form.role_id),
  };

  for (const field of permissionFields) {
    payload[field.key] = normalizePermissionValue(form[field.key]);
  }

  return payload;
}

function permissionText(value) {
  if (value === true || value === 1) return "Allow";
  return "Inherit";
}

function permissionClass(value) {
  if (value === true || value === 1) {
    return "border-success-50 bg-success-50 text-success-700";
  }

  return "border-enterprise-border bg-enterprise-soft text-enterprise-muted";
}

function toFormPermissionValue(value) {
  if (value === true || value === 1) return "1";
  return "";
}

function extractRows(data) {
  return data?.data || data?.userRoles || data || [];
}

function rowToForm(row) {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    user_code: row.user_code || row.userCode || "",
    user_name: row.user_name || row.userName || "",
    department_id: row.department_id ?? null,
    role_id: row.role_id ?? null,
    can_view_budget: toFormPermissionValue(row.can_view_budget),
    can_edit_budget: toFormPermissionValue(row.can_edit_budget),
    can_view_po_links: toFormPermissionValue(row.can_view_po_links),
    can_request_po_links: toFormPermissionValue(row.can_request_po_links),
    can_view_all_po_link_requests: toFormPermissionValue(
      row.can_view_all_po_link_requests,
    ),
    can_approve_po_links: toFormPermissionValue(row.can_approve_po_links),
    can_request_transfer: toFormPermissionValue(row.can_request_transfer),
    can_approve_budget: toFormPermissionValue(row.can_approve_budget),
    can_approve_transfer: toFormPermissionValue(row.can_approve_transfer),
    can_manage_users: toFormPermissionValue(row.can_manage_users),
    can_manage_categories: toFormPermissionValue(row.can_manage_categories),
    can_manage_po_item_mappings: toFormPermissionValue(
      row.can_manage_po_item_mappings,
    ),
    can_view_reports: toFormPermissionValue(row.can_view_reports),
  };
}

export default function BudgetAccessManagementPage() {
  const [form, setForm] = useState(emptyForm);
  const [userSearch, setUserSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const assignmentsQuery = useBudgetAccessAssignments();

  const usersQuery = useBudgetAccessUsers({
    search: userSearch,
    pageSize: 50,
  });

  const departmentsQuery = useBudgetAccessDepartments();
  const rolesQuery = useBudgetAccessRoles();

  const createAssignmentMutation = useCreateBudgetAccessAssignment();
  const updateAssignmentMutation = useUpdateBudgetAccessAssignment();
  const updateStatusMutation = useToggleBudgetAccessAssignmentStatus();
  const deleteAssignmentMutation = useDeleteBudgetAccessAssignment();
  const rows = extractRows(assignmentsQuery.data);
  const adminUsers =
    usersQuery.data?.pages.flatMap((page) => page?.data?.users || []) || [];

  const userOptions = adminUsers.map((user) => ({
    id: user.id,
    name: user.userName,
    code: user.userCode,
  }));

  const selectedUserOption = form.user_id
    ? [
        {
          id: form.user_id,
          name: form.user_name,
          code: form.user_code,
        },
      ]
    : [];

  const mergedUserOptions = [
    ...selectedUserOption,
    ...userOptions.filter((user) => user.id !== form.user_id),
  ];

  const departmentOptions = departmentsQuery.data?.data || [];
  const roleOptions = rolesQuery.data?.data || [];

  const filteredRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const code = String(row.user_code || row.userCode || "").toLowerCase();
      const name = String(row.user_name || row.userName || "").toLowerCase();
      const role = String(row.role_name || "").toLowerCase();
      const department = String(row.department_name || "global").toLowerCase();

      return (
        code.includes(q) ||
        name.includes(q) ||
        role.includes(q) ||
        department.includes(q)
      );
    });
  }, [rows, tableSearch]);

  const isEditing = Boolean(form.id);

  const saving =
    createAssignmentMutation.isPending ||
    updateAssignmentMutation.isPending ||
    updateStatusMutation.isPending ||
    deleteAssignmentMutation.isPending;
  const activeCount = useMemo(
    () => rows.filter((row) => row.is_active).length,
    [rows],
  );

  function resetForm() {
    setForm(emptyForm);
  }

  function handleEdit(row) {
    setForm(rowToForm(row));
  }

  function handleUserSelect(userId) {
    const selectedUser = mergedUserOptions.find((user) => user.id === userId);

    const existingAccess = rows.find((row) => row.user_id === userId);

    if (existingAccess) {
      setForm(rowToForm(existingAccess));
      return;
    }

    setForm({
      ...emptyForm,
      user_id: userId,
      user_code: selectedUser?.code || "",
      user_name: selectedUser?.name || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const selectedRole = roleOptions.find((r) => r.id === form.role_id);

    const isHod = selectedRole?.name?.toUpperCase() === "HOD";

    if (isHod && !form.department_id) {
      toast.error("Department is required for HOD role");

      return;
    }
    console.log("FORM BEFORE SUBMIT");
    console.log(form);

    console.log("PO PERMISSIONS");
    console.log({
      can_view_po_links: form.can_view_po_links,
      can_request_po_links: form.can_request_po_links,
      can_view_all_po_link_requests: form.can_view_all_po_link_requests,
      can_approve_po_links: form.can_approve_po_links,
    });
    console.log("RAW VALUES", {
      can_view_po_links: form.can_view_po_links,
      can_request_po_links: form.can_request_po_links,
      can_view_all_po_link_requests: form.can_view_all_po_link_requests,
      can_approve_po_links: form.can_approve_po_links,
    });

    console.log("RAW TYPES", {
      can_view_po_links: typeof form.can_view_po_links,
      can_request_po_links: typeof form.can_request_po_links,
      can_view_all_po_link_requests: typeof form.can_view_all_po_link_requests,
      can_approve_po_links: typeof form.can_approve_po_links,
    });

    const payload = buildPayload(form);

    console.log("FINAL PAYLOAD", payload);

    if (isEditing) {
      await updateAssignmentMutation.mutateAsync({
        id: form.id,
        payload,
      });
    } else {
      await createAssignmentMutation.mutateAsync(payload);
    }

    await assignmentsQuery.refetch();
    resetForm();
  }
  const selectedRole = roleOptions.find((r) => r.id === form.role_id);

  const isHod = selectedRole?.name?.toUpperCase() === "HOD";

  const isHodWithoutDepartment = isHod && !form.department_id;
  async function handleToggleStatus(row) {
    await updateStatusMutation.mutateAsync({
      id: row.id,
      is_active: !row.is_active,
    });

    await assignmentsQuery.refetch();
  }

  function requestDeleteAssignment(row) {
    setDeleteTarget(row);
  }

  async function confirmDeleteAssignment() {
    if (!deleteTarget) return;

    await deleteAssignmentMutation.mutateAsync(deleteTarget.id);

    if (form.id === deleteTarget.id) {
      resetForm();
    }

    await assignmentsQuery.refetch();
    setDeleteTarget(null);
  }

  if (assignmentsQuery.isLoading) {
    return (
      <PageLoader
        title="Loading users"
        description="Preparing Budget System user access..."
      />
    );
  }

  return (
    <div className="min-w-0 space-y-6 font-sans">
      <section className="rounded-panel border border-enterprise-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-primary-700">
              Admin Management
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-enterprise-text">
              Budget System Users
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-enterprise-muted">
              Add hospital users to the Budget System, assign their department
              and role, and optionally allow specific permissions. Permissions
              are either inherited from the role or explicitly allowed.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-card border border-enterprise-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm text-enterprise-muted">Total Users</p>
            <Users size={18} className="text-primary-700" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-enterprise-text">
            {rows.length}
          </p>
        </div>

        <div className="rounded-card border border-enterprise-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm text-enterprise-muted">Active Users</p>
            <CheckCircle2 size={18} className="text-success-700" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-enterprise-text">
            {activeCount}
          </p>
        </div>

        <div className="rounded-card border border-enterprise-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm text-enterprise-muted">Inactive Users</p>
            <XCircle size={18} className="text-danger-700" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-enterprise-text">
            {rows.length - activeCount}
          </p>
        </div>
      </section>

      <section
        className={`grid min-w-0 gap-6 xl:items-start ${
          isFormOpen
            ? "xl:grid-cols-[520px_minmax(0,1fr)]"
            : "xl:grid-cols-[minmax(0,1fr)]"
        }`}
      >
        <AnimatePresence mode="wait">
          {isFormOpen && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="rounded-card border border-enterprise-border bg-white shadow-card overflow-hidden"
            >
              <div className="border-b border-enterprise-border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                      Step 1
                    </p>

                    <h3 className="mt-1 text-lg font-semibold tracking-tight text-enterprise-text">
                      Select User
                    </h3>

                    <p className="mt-1 text-sm text-enterprise-muted">
                      Search by user name or user code. Existing users will load
                      automatically for editing.
                    </p>
                  </div>

                  {form.user_id && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
                      >
                        <X size={14} />
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <SearchableMultiSelect
                    name="user_id"
                    multiple={false}
                    value={form.user_id}
                    options={mergedUserOptions}
                    disabled={isEditing}
                    placeholder="Search and select user"
                    searchPlaceholder="Search by user name or user code..."
                    noResultsText="No users found"
                    maxVisibleBadges={1}
                    searchValue={userSearch}
                    onSearchChange={setUserSearch}
                    loading={
                      usersQuery.isLoading || usersQuery.isFetchingNextPage
                    }
                    hasMore={Boolean(usersQuery.hasNextPage)}
                    onLoadMore={() => {
                      if (
                        usersQuery.hasNextPage &&
                        !usersQuery.isFetchingNextPage
                      ) {
                        usersQuery.fetchNextPage();
                      }
                    }}
                    getOptionValue={(user) => user.id}
                    getOptionLabel={(user) =>
                      `${user.name || "Unknown"}${
                        user.code ? ` - ${user.code}` : ""
                      }`
                    }
                    onChange={(e) =>
                      handleUserSelect(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </div>

                {form.user_id && (
                  <div className="mt-5 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary-700 shadow-soft">
                        <UserCog size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-enterprise-text">
                          {form.user_code || `User ${form.user_id}`}
                        </p>
                        <p className="truncate text-sm text-enterprise-muted">
                          {form.user_name || "No user name"}
                        </p>
                      </div>

                      <span
                        className={[
                          "ml-auto rounded-full px-3 py-1 text-xs font-semibold",
                          isEditing
                            ? "bg-success-50 text-success-700"
                            : "bg-white text-primary-700",
                        ].join(" ")}
                      >
                        {isEditing ? "Existing access" : "New access"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                    Step 2
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-enterprise-text">
                    Access Details
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <label className="text-sm font-medium text-enterprise-text">
                        Department
                      </label>

                      <div className="mt-2">
                        <SearchableMultiSelect
                          name="department_id"
                          multiple={false}
                          value={form.department_id}
                          options={departmentOptions}
                          placeholder="Global access / select department"
                          searchPlaceholder="Search department..."
                          noResultsText="No departments found"
                          maxVisibleBadges={1}
                          getOptionValue={(department) => department.id}
                          getOptionLabel={(department) => department.name}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              department_id: e.target.value
                                ? Number(e.target.value)
                                : null,
                            }));
                          }}
                        />
                        {isHodWithoutDepartment && (
                          <p className="mt-2 text-sm font-medium text-danger-600">
                            Department is required for HOD role
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-enterprise-text">
                        Role
                      </label>

                      <div className="mt-2">
                        <SearchableMultiSelect
                          name="role_id"
                          multiple={false}
                          value={form.role_id}
                          options={roleOptions}
                          placeholder="Select role"
                          searchPlaceholder="Search role..."
                          noResultsText="No roles found"
                          maxVisibleBadges={1}
                          getOptionValue={(role) => role.id}
                          getOptionLabel={(role) => role.name}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              role_id: e.target.value
                                ? Number(e.target.value)
                                : null,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-enterprise-border bg-enterprise-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                    Step 3
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-enterprise-text">
                    Optional Permission Allows
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-enterprise-muted">
                    Keep permissions as “Inherit from role” unless this user
                    needs a specific extra permission.
                  </p>

                  <div className="mt-4 grid gap-3">
                    {permissionFields.map((permission) => (
                      <div
                        key={permission.key}
                        className="grid grid-cols-[1fr_170px] items-center gap-3 rounded-xl bg-white p-3"
                      >
                        <span className="text-sm font-medium text-enterprise-text">
                          {permission.label}
                        </span>

                        <SearchableMultiSelect
                          name={permission.key}
                          multiple={false}
                          value={form[permission.key]}
                          options={permissionOptions}
                          placeholder="Inherit"
                          searchPlaceholder="Search..."
                          noResultsText="No options found"
                          maxVisibleBadges={1}
                          getOptionValue={(option) => option.id}
                          getOptionLabel={(option) => option.name}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              [permission.key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.user_id ||
                    !form.role_id ||
                    isHodWithoutDepartment
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEditing ? <Save size={17} /> : <Plus size={17} />}
                  {saving
                    ? "Saving..."
                    : isEditing
                      ? "Save Access Changes"
                      : "Add User Access"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <section className="min-w-0 rounded-card border border-enterprise-border bg-white shadow-card">
          <div className="border-b border-enterprise-border p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-enterprise-text">
                    Current Budget Users
                  </h3>

                  <CollapsiblePanelToggle
                    isOpen={isFormOpen}
                    onToggle={() => setIsFormOpen((prev) => !prev)}
                    openLabel="Show Form"
                    closeLabel="Hide Form"
                  />
                </div>

                <p className="mt-1 text-sm text-enterprise-muted">
                  Click a row to review or update access.
                </p>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-enterprise-muted" />
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search current users..."
                  className="h-11 w-full rounded-xl border border-enterprise-border bg-enterprise-soft pl-10 pr-3 text-sm outline-none transition focus:border-primary-300 focus:bg-white focus:ring-4 focus:ring-primary-50"
                />
              </div>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto">
            <div className="max-h-[800px] overflow-y-auto">
              <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-10 bg-enterprise-soft">
                  <tr className="bg-enterprise-soft text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                    <th className="border-b border-enterprise-border px-4 py-3">
                      User
                    </th>
                    <th className="border-b border-enterprise-border px-4 py-3">
                      Department
                    </th>
                    <th className="border-b border-enterprise-border px-4 py-3">
                      Role
                    </th>
                    <th className="border-b border-enterprise-border px-4 py-3">
                      Extra Allows
                    </th>
                    <th className="border-b border-enterprise-border px-4 py-3">
                      Status
                    </th>
                    <th className="border-b border-enterprise-border px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleEdit(row)}
                      className={[
                        "cursor-pointer text-enterprise-text transition hover:bg-enterprise-soft",
                        form.id === row.id ? "bg-primary-50" : "",
                      ].join(" ")}
                    >
                      <td className="border-b border-enterprise-border px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                            <UserCog size={17} />
                          </div>

                          <div>
                            <p className="font-semibold">
                              {row.user_code ||
                                row.userCode ||
                                `User ${row.user_id}`}
                            </p>

                            <p className="text-xs text-enterprise-muted">
                              {row.user_name || row.userName || "No user name"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="border-b border-enterprise-border px-4 py-4">
                        {row.department_name || "Global"}
                      </td>

                      <td className="border-b border-enterprise-border px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                          <ShieldCheck size={14} />
                          {row.role_name || `Role #${row.role_id}`}
                        </span>
                      </td>

                      <td className="border-b border-enterprise-border px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {permissionFields
                            .filter(
                              (permission) =>
                                row[permission.key] === true ||
                                row[permission.key] === 1,
                            )
                            .slice(0, 4)
                            .map((permission) => (
                              <span
                                key={permission.key}
                                className={[
                                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                                  permissionClass(row[permission.key]),
                                ].join(" ")}
                              >
                                {permission.label}
                              </span>
                            ))}

                          {permissionFields.filter(
                            (permission) =>
                              row[permission.key] === true ||
                              row[permission.key] === 1,
                          ).length === 0 && (
                            <span className="rounded-full border border-enterprise-border bg-enterprise-soft px-2.5 py-1 text-xs font-medium text-enterprise-muted">
                              Role defaults
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="border-b border-enterprise-border px-4 py-4">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            row.is_active
                              ? "bg-success-50 text-success-700"
                              : "bg-danger-50 text-danger-700",
                          ].join(" ")}
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="border-b border-enterprise-border px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(row);
                            }}
                            className="rounded-lg border border-enterprise-border bg-white px-3 py-2 text-xs font-medium text-enterprise-text transition hover:bg-enterprise-soft"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(row);
                            }}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-enterprise-border bg-white px-3 py-2 text-xs font-medium text-enterprise-text transition hover:bg-enterprise-soft disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Power size={14} />
                            {row.is_active ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteAssignment(row);
                            }}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-12 text-center text-sm text-enterprise-muted"
                      >
                        No matching users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete User Access"
        message={
          <>
            <p>
              This action will permanently delete this user access assignment
              from the system.
            </p>
            <p className="mt-2 font-bold">
              This is a hard delete and cannot be undone.
            </p>
            <p className="mt-2">Are you sure you want to continue?</p>
          </>
        }
        confirmText="Delete User Access"
        cancelText="Cancel"
        danger
        loading={deleteAssignmentMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteAssignment}
      />
    </div>
  );
}
