import SearchableMultiSelect from "../SearchableMultiSelect";

export default function CatalogSubItemFields({
  value,
  onChange,
  unitsOfMeasure,
  loadingUnitsOfMeasure,
  lockIdentity = false,
  disabled = false,
}) {
  const updateField = (field, nextValue) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-bold uppercase text-slate-500">
            Reusable code
          </span>
          <p className="mt-1 text-sm font-black text-slate-900">
            {value.sub_item_code || "Generated automatically after save"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Read-only reference; the database ID remains the system identifier.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-500">
            Model name
          </span>
          <input
            value={value.name}
            onChange={(event) => updateField("name", event.target.value)}
            disabled={disabled || lockIdentity}
            placeholder="Example: Dell Latitude 5450"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase text-slate-500">
          Default specification
        </span>
        <textarea
          value={value.default_specification}
          onChange={(event) =>
            updateField("default_specification", event.target.value)
          }
          disabled={disabled}
          rows={4}
          placeholder="Reusable default specification copied into future package snapshots"
          className="mt-1 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase text-slate-500">
          Default Unit of Measure
        </span>
        <div className="mt-1">
          <SearchableMultiSelect
            multiple={false}
            disableClear
            value={value.default_unit_of_measure_id}
            onChange={(event) =>
              updateField("default_unit_of_measure_id", event.target.value)
            }
            options={unitsOfMeasure}
            placeholder={
              loadingUnitsOfMeasure ? "Loading units..." : "Select unit"
            }
            searchPlaceholder="Search units..."
            getOptionLabel={(unit) =>
              unit.unit_code ? `${unit.name} (${unit.unit_code})` : unit.name
            }
            getOptionValue={(unit) => String(unit.id)}
          />
        </div>
      </label>
    </div>
  );
}
