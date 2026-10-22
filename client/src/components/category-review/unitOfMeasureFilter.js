// Shared catalog-unit filtering for Category Manager Stage 1 and Stage 2.
// Use the actual unit from the API, never guess based on an item name.
export function unitOfMeasureLabel(item) {
  return String(item?.unit_name || item?.unit_code || item?.unit_of_measure_name || item?.unit_of_measure_code || "").trim();
}

export function unitOfMeasureKey(item) {
  return unitOfMeasureLabel(item).toLocaleLowerCase();
}

export function unitOfMeasureOptions(items = []) {
  const labels = new Map();
  for (const item of items) {
    const label = unitOfMeasureLabel(item);
    const key = label.toLocaleLowerCase();
    if (key && !labels.has(key)) labels.set(key, label);
  }
  return [
    { value: "ALL", label: "All units of measure" },
    ...Array.from(labels, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

export function matchesUnitOfMeasure(item, unit) {
  return unit === "ALL" || unitOfMeasureKey(item) === unit;
}
