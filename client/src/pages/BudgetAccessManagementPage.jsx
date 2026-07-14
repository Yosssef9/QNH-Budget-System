import { useMemo, useState } from "react";
import {
  Plus,
  Save,
  X,
  ShieldCheck,
  UserCog,
  Power,
  Users,
  CheckCircle2,
  XCircle,
  Search,
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
  useBudgetAccessAssignmentPermissionOverrides,
  useReplaceBudgetAccessAssignmentPermissionOverrides,
} from "../hooks/budget-access/useBudgetAccessAssignments";
import CollapsiblePanelToggle from "../components/layout/CollapsiblePanelToggle";
import { useBudgetAccessUsers } from "../hooks/budget-access/useBudgetAccessUsers";
import { useBudgetAccessDepartments } from "../hooks/budget-access/useBudgetAccessDepartments";
import { useBudgetAccessRoles } from "../hooks/budget-access/useBudgetAccessRoles";
import { useSetupCategories } from "../hooks/budgets/useBudgetSetup";
import toast from "react-hot-toast";

const departmentScopedRoles = [
  "DEPARTMENT_BUDGET_MANAGER",
  "DEPARTMENT_USER",
];

const emptyPermissionRows = [];

const permissionOverrideOptions = [
  { value: "INHERIT", label: "Inherit" },
  { value: "GRANT", label: "Grant" },
  { value: "DENY", label: "Deny" },
];

const emptyForm = {
  id: null,
  user_id: null,
  user_code: "",
  user_name: "",
  department_id: null,
  budget_category_id: null,
  role_id: null,
};

function buildPayload(form) {
  return {
    user_id: Number(form.user_id),
    department_id: form.department_id ? Number(form.department_id) : null,
    budget_category_id: form.budget_category_id
      ? Number(form.budget_category_id)
      : null,
    role_id: Number(form.role_id),
  };
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
    budget_category_id: row.budget_category_id ?? null,
    role_id: row.role_id ?? null,
  };
}

function roleScope(role) {
  const roleCode = role?.role_code;

  if (departmentScopedRoles.includes(roleCode)) {
    return "DEPARTMENT";
  }

  if (roleCode === "CATEGORY_BUDGET_MANAGER") {
    return "CATEGORY";
  }

  return "GLOBAL";
}

function scopeLabel(row) {
  if (row.department_name) return `Department: ${row.department_name}`;
  if (row.budget_category_name) return `Category: ${row.budget_category_name}`;
  return "Global";
}

export default function BudgetAccessManagementPage() {
  const [form, setForm] = useState(emptyForm);
  const [permissionOverrideDraft, setPermissionOverrideDraft] = useState({});
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
  const categoriesQuery = useSetupCategories();

  const createAssignmentMutation = useCreateBudgetAccessAssignment();
  const updateAssignmentMutation = useUpdateBudgetAccessAssignment();
  const updateStatusMutation = useToggleBudgetAccessAssignmentStatus();
  const deleteAssignmentMutation = useDeleteBudgetAccessAssignment();
  const permissionOverridesQuery =
    useBudgetAccessAssignmentPermissionOverrides(form.id);
  const replacePermissionOverridesMutation =
    useReplaceBudgetAccessAssignmentPermissionOverrides();
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
  const categoryOptions = categoriesQuery.data || [];
  const roleOptions = rolesQuery.data?.data || [];
  const permissionOverrideState = permissionOverridesQuery.data?.data;
  const permissionRows =
    permissionOverrideState?.permissions || emptyPermissionRows;
  const groupedPermissionRows = useMemo(() => {
    return permissionRows.reduce((groups, permission) => {
      const group = permission.permission_group || "OTHER";
      groups[group] = groups[group] || [];
      groups[group].push(permission);
      return groups;
    }, {});
  }, [permissionRows]);

  const filteredRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const code = String(row.user_code || row.userCode || "").toLowerCase();
      const name = String(row.user_name || row.userName || "").toLowerCase();
      const role = String(row.role_name || "").toLowerCase();
      const department = String(row.department_name || "").toLowerCase();
      const category = String(row.budget_category_name || "").toLowerCase();
      const scope = scopeLabel(row).toLowerCase();

      return (
        code.includes(q) ||
        name.includes(q) ||
        role.includes(q) ||
        department.includes(q) ||
        category.includes(q) ||
        scope.includes(q)
      );
    });
  }, [rows, tableSearch]);

  const isEditing = Boolean(form.id);

  const saving =
    createAssignmentMutation.isPending ||
    updateAssignmentMutation.isPending ||
    updateStatusMutation.isPending ||
    deleteAssignmentMutation.isPending ||
    replacePermissionOverridesMutation.isPending;
  const activeCount = useMemo(
    () => rows.filter((row) => row.is_active).length,
    [rows],
  );

  function resetForm() {
    setForm(emptyForm);
    setPermissionOverrideDraft({});
  }

  function handleEdit(row) {
    setForm(rowToForm(row));
  }

  function handleUserSelect(userId) {
    const selectedUser = mergedUserOptions.find((user) => user.id === userId);

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
    const scope = roleScope(selectedRole);

    if (scope === "DEPARTMENT" && !form.department_id) {
      toast.error("Department is required for this role");

      return;
    }

    if (scope === "CATEGORY" && !form.budget_category_id) {
      toast.error("Budget category is required for this role");

      return;
    }

    const payload = buildPayload({
      ...form,
      department_id: scope === "DEPARTMENT" ? form.department_id : null,
      budget_category_id:
        scope === "CATEGORY" ? form.budget_category_id : null,
    });

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
  const selectedRoleScope = roleScope(selectedRole);
  const requiresDepartment = selectedRoleScope === "DEPARTMENT";
  const requiresCategory = selectedRoleScope === "CATEGORY";
  const isMissingRequiredScope =
    (requiresDepartment && !form.department_id) ||
    (requiresCategory && !form.budget_category_id);
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

  function handlePermissionOverrideChange(permissionId, action) {
    setPermissionOverrideDraft((prev) => ({
      ...prev,
      [permissionId]: action,
    }));
  }

  async function handleSavePermissionOverrides() {
    if (!form.id) return;

    const overrides = permissionRows
      .map((permission) => ({
        permission_id: permission.permission_id,
        action:
          permissionOverrideDraft[permission.permission_id] ??
          permission.override_action ??
          "INHERIT",
      }))
      .filter((override) => ["GRANT", "DENY"].includes(override.action));

    await replacePermissionOverridesMutation.mutateAsync({
      id: form.id,
      overrides,
    });

    await permissionOverridesQuery.refetch();
    await assignmentsQuery.refetch();
    setPermissionOverrideDraft({});
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
              Add hospital users to the Budget System and assign each active
              workspace by role and required department or category scope.
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
                      Search by user name or user code. A user may have more
                      than one active workspace when the role and scope differ.
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
                        Department Scope
                      </label>

                      <div className="mt-2">
                        <SearchableMultiSelect
                          name="department_id"
                          multiple={false}
                          value={form.department_id}
                          options={departmentOptions}
                          disabled={!requiresDepartment}
                          placeholder={
                            requiresDepartment
                              ? "Select department"
                              : "Not used for this role"
                          }
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
                        {requiresDepartment && !form.department_id && (
                          <p className="mt-2 text-sm font-medium text-danger-600">
                            Department is required for this role.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-enterprise-text">
                        Category Scope
                      </label>

                      <div className="mt-2">
                        <SearchableMultiSelect
                          name="budget_category_id"
                          multiple={false}
                          value={form.budget_category_id}
                          options={categoryOptions}
                          disabled={!requiresCategory}
                          placeholder={
                            requiresCategory
                              ? "Select category"
                              : "Not used for this role"
                          }
                          searchPlaceholder="Search category..."
                          noResultsText="No categories found"
                          maxVisibleBadges={1}
                          getOptionValue={(category) => category.id}
                          getOptionLabel={(category) =>
                            category.name || category.category_name
                          }
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              budget_category_id: e.target.value
                                ? Number(e.target.value)
                                : null,
                            }));
                          }}
                        />
                        {requiresCategory && !form.budget_category_id && (
                          <p className="mt-2 text-sm font-medium text-danger-600">
                            Budget category is required for this role.
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
                            const roleId = e.target.value
                              ? Number(e.target.value)
                              : null;
                            const nextRole = roleOptions.find(
                              (role) => role.id === roleId,
                            );
                            const nextScope = roleScope(nextRole);

                            setForm((prev) => ({
                              ...prev,
                              role_id: roleId,
                              department_id:
                                nextScope === "DEPARTMENT"
                                  ? prev.department_id
                                  : null,
                              budget_category_id:
                                nextScope === "CATEGORY"
                                  ? prev.budget_category_id
                                  : null,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isEditing && (
                <div className="rounded-2xl border border-enterprise-border bg-enterprise-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                    Step 3
                  </p>

                  <h3 className="mt-1 text-base font-semibold text-enterprise-text">
                    Permission Overrides
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-enterprise-muted">
                    Keep permissions as “Inherit from role” unless this user
                    needs a specific extra permission.
                  </p>

                  <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
                    {permissionOverridesQuery.isFetching ? (
                      <div className="rounded-xl bg-white p-4 text-sm text-enterprise-muted">
                        Loading permission overrides...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupedPermissionRows).map(
                          ([group, permissions]) => (
                            <div key={group} className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                                {group.replaceAll("_", " ")}
                              </p>

                              {permissions.map((permission) => {
                                const selectedAction =
                                  permissionOverrideDraft[
                                    permission.permission_id
                                  ] ||
                                  permission.override_action ||
                                  "INHERIT";
                                const effectiveAllowed =
                                  selectedAction === "GRANT"
                                    ? true
                                    : selectedAction === "DENY"
                                      ? false
                                      : permission.role_default;

                                return (
                                  <div
                                    key={permission.permission_id}
                                    className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[minmax(0,1fr)_150px]"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-enterprise-text">
                                          {permission.name}
                                        </p>
                                        <span
                                          className={[
                                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                                            effectiveAllowed
                                              ? "bg-success-50 text-success-700"
                                              : "bg-danger-50 text-danger-700",
                                          ].join(" ")}
                                        >
                                          {effectiveAllowed
                                            ? "Allowed"
                                            : "Denied"}
                                        </span>
                                      </div>

                                      <p className="mt-1 break-words text-xs text-enterprise-muted">
                                        {permission.permission_code}
                                      </p>
                                    </div>

                                  <SearchableMultiSelect
  name={`permission_override_${permission.permission_id}`}
  multiple={false}
  disableClear
  value={selectedAction}
  options={permissionOverrideOptions}
  placeholder="Select override"
  searchPlaceholder="Search override..."
  noResultsText="No override actions found"
  maxVisibleBadges={1}
  onChange={(event) =>
    handlePermissionOverrideChange(
      permission.permission_id,
      event.target.value,
    )
  }
/>
                                  </div>
                                );
                              })}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      permissionOverridesQuery.isFetching ||
                      !permissionRows.length
                    }
                    onClick={handleSavePermissionOverrides}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm font-semibold text-primary-700 shadow-soft transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={17} />
                    {replacePermissionOverridesMutation.isPending
                      ? "Saving Overrides..."
                      : "Save Permission Overrides"}
                  </button>
                </div>
                )}

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.user_id ||
                    !form.role_id ||
                    isMissingRequiredScope
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
              <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-10 bg-enterprise-soft">
                  <tr className="bg-enterprise-soft text-xs font-semibold uppercase tracking-wide text-enterprise-muted">
                    <th className="border-b border-enterprise-border px-4 py-3">
                      User
                    </th>
                    <th className="border-b border-enterprise-border px-4 py-3">
                      Scope
                    </th>
                    <th className="border-b border-enterprise-border px-4 py-3">
                      Role
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
                        {scopeLabel(row)}
                      </td>

                      <td className="border-b border-enterprise-border px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                          <ShieldCheck size={14} />
                          {row.role_name || `Role #${row.role_id}`}
                        </span>
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
                        colSpan="5"
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
