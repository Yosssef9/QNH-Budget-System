/** Determine the appropriate CM correction entry without changing item data. */
export function getCfoRevisionItemEntry(models = []) {
  const activeModels = Array.isArray(models) ? models.filter((model) => model && model.is_active !== false && model.is_active !== 0) : [];
  if (activeModels.length !== 1) return { type: "MODELS" };
  const [model] = activeModels;
  const general = String(model.sub_item_code || "").trim().toUpperCase() === "GENERAL" &&
    (model.is_default_general === true || Number(model.is_default_general) === 1);
  return general ? { type: "EDIT_GENERAL", model } : { type: "MODELS" };
}
