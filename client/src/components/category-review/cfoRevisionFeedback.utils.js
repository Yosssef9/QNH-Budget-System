/** Presentation-only grouping. Individual item decisions and notes remain authoritative. */
export function normalizeCfoReason(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function isCfoRevisionItem(item) {
  return item?.cfo_review_status === "NEEDS_MODIFICATION" ||
    item?.package_item_cfo_review_status === "NEEDS_MODIFICATION";
}

export function buildCfoRevisionFeedback(items = []) {
  const affected = items.filter(isCfoRevisionItem);
  const groups = new Map();
  affected.forEach((item) => {
    const message = normalizeCfoReason(
      item.cfo_review_note ?? item.package_item_cfo_review_note,
    );
    if (!message) return;
    const key = message.toLocaleLowerCase();
    const old = groups.get(key) || { text: message, count: 0, ids: [] };
    old.count += 1;
    old.ids.push(item.id);
    groups.set(key, old);
  });
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count);
  return {
    affected,
    affectedCount: affected.length,
    groups: sorted,
    shared: sorted.filter((g) => g.count > 1),
    mainReason: sorted[0]?.text || null,
    otherReasonCount: Math.max(0, sorted.length - 1),
    getLabel(item) {
      const text = normalizeCfoReason(item?.cfo_review_note ?? item?.package_item_cfo_review_note);
      const match = groups.get(text.toLocaleLowerCase());
      return match?.count > 1 ? "Shared instruction" : "Item-specific instruction";
    },
  };
}

/** Keep the return summary brief even for historical packages with repeated notes. */
export function cfoReturnSummary(packageName, affectedCount) {
  const category = String(packageName || "Category").trim();
  return `${category} package returned by CFO. ${affectedCount} item${affectedCount === 1 ? "" : "s"} require revision; see the affected item notes for instructions.`;
}


/** Outstanding CFO decisions by catalog ID for the current return cycle only. */
export function getCurrentCfoRevisionsByCatalogId(packageItems = [], packageStatus) {
  const result = new Map();
  if (packageStatus !== "RETURNED_BY_CFO") return result;

  for (const item of packageItems) {
    // Prefer the current package status over a legacy mirrored review status.
    const needsRevision = item?.cfo_review_status != null
      ? item.cfo_review_status === "NEEDS_MODIFICATION"
      : isCfoRevisionItem(item);
    if (!needsRevision) continue;
    const catalogId = Number(item?.catalog_item_id);
    if (!Number.isSafeInteger(catalogId) || catalogId <= 0) continue;
    const previous = result.get(catalogId);
    const hasNote = Boolean(String(item.cfo_review_note ?? item.package_item_cfo_review_note ?? "").trim());
    const previousHasNote = Boolean(String(previous?.cfo_review_note ?? previous?.package_item_cfo_review_note ?? "").trim());
    // Prefer a decision with an actual instruction if legacy data has duplicate catalog IDs.
    if (!previous || (hasNote && !previousHasNote)) result.set(catalogId, item);
  }
  return result;
}
