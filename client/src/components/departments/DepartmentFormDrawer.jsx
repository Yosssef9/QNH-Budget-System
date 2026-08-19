import { useEffect, useState } from "react";
import { Building2, Info, Plus, Save, X } from "lucide-react";
import AnimatedDrawer from "../budgets/shared/drawers/AnimatedDrawer";
import Input from "../Input";

const EMPTY_FORM = {
  name: "",
  department_code: "",
  description: "",
  is_active: true,
};

function previewDepartmentCode(name) {
  return String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50)
    .replace(/_+$/g, "");
}

export default function DepartmentFormDrawer({
  open,
  mode = "create",
  department,
  financialYear,
  saving = false,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    setForm(
      isEdit
        ? {
            name: department?.name || "",
            department_code: department?.department_code || "",
            description: department?.description || "",
            is_active: Boolean(department?.is_active),
          }
        : EMPTY_FORM,
    );
    setErrors({});
  }, [department, isEdit, open]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!isEdit && !form.name.trim()) {
      nextErrors.name = "Department name is required";
    }

    if (
      !isEdit &&
      form.department_code.trim() &&
      !/^[A-Z0-9_-]+$/.test(form.department_code.trim())
    ) {
      nextErrors.department_code =
        "Use only letters, numbers, underscores, and hyphens";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit?.(
      isEdit
        ? { description: form.description.trim() || null }
        : {
            name: form.name.trim(),
            department_code: form.department_code.trim(),
            description: form.description.trim() || null,
            is_active: form.is_active,
          },
    );
  }

  const yearStatus = financialYear?.status;

  return (
    <AnimatedDrawer
      open={open}
      onClose={() => !saving && onClose?.()}
      fullScreen
    >
      <form onSubmit={handleSubmit} className="flex h-full flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Building2 size={21} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">
                  {isEdit ? "Edit Department" : "Add Department"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isEdit
                    ? "Update the department description. Its identity remains fixed."
                    : "Create a hospital department and choose when it becomes active."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={saving}
              title="Close"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {isEdit ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Department identity
              </p>
              <p className="mt-2 break-words text-base font-bold text-slate-900">
                {department?.name}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {department?.department_code}
              </p>
            </section>
          ) : (
            <>
              <Input
                label="Department Name"
                required
                value={form.name}
                error={errors.name}
                maxLength={200}
                placeholder="Clinical Engineering"
                onChange={(event) => updateField("name", event.target.value)}
              />
              <Input
                label="Department Code"
                value={form.department_code}
                error={errors.department_code}
                maxLength={50}
                placeholder="CLINICAL_ENGINEERING"
                onChange={(event) =>
                  updateField(
                    "department_code",
                    event.target.value.toUpperCase().replace(/\s+/g, "_"),
                  )
                }
              />
              <p className="-mt-3 text-xs text-slate-500">
                Optional. Leave blank to use{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {previewDepartmentCode(form.name) || "A_CODE_FROM_THE_NAME"}
                </span>
                .
              </p>
            </>
          )}

          <Input
            label="Description"
            multiline
            rows={5}
            value={form.description}
            maxLength={500}
            placeholder="Optional department description"
            onChange={(event) => updateField("description", event.target.value)}
          />

          {!isEdit && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">Active Department</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Active departments participate in new financial-year budgets.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => updateField("is_active", !form.is_active)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    form.is_active ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      form.is_active ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {form.is_active && (
                <div
                  className={`mt-4 flex gap-2 rounded-lg border p-3 text-sm ${
                    yearStatus === "PRE_CLOSING"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  <Info size={17} className="mt-0.5 shrink-0" />
                  <p>
                    {yearStatus === "PRE_CLOSING"
                      ? `Financial year ${financialYear?.year} is in pre-closing. Create this department as inactive for a future year.`
                      : yearStatus === "OPEN"
                        ? `If financial year ${financialYear?.year} still accepts department onboarding, its three category budgets will be created automatically.`
                        : "The department will be included when the next financial year is opened."}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEdit ? <Save size={17} /> : <Plus size={17} />}
            {saving
              ? "Saving..."
              : isEdit
                ? "Save Description"
                : "Add Department"}
          </button>
        </footer>
      </form>
    </AnimatedDrawer>
  );
}
