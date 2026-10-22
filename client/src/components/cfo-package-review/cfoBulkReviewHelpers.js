/** Pending-only snapshot, matched against current DB versions within the transaction. */
export function pendingCfoSnapshot(pkg) {
  return (pkg?.items || [])
    .filter(item => item.cfo_review_status === "PENDING_CFO_REVIEW")
    .map(item => ({ id: Number(item.id), row_version: item.row_version }));
}

/** Editable draft of the category return reason based on already recorded item notes. */
export function suggestCfoReturnReason(pkg) {
  const flagged = (pkg?.items || []).filter(item => item.cfo_review_status === "NEEDS_MODIFICATION");
  if (!flagged.length) return "";
  const category = String(pkg?.category_name || "Category").trim();
  return `${category} package returned for revision. ${flagged.length} item${flagged.length === 1 ? "" : "s"} require modification; see the saved CFO feedback for the affected items.`;
}
