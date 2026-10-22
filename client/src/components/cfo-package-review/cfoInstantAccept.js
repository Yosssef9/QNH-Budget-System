/** Pure helpers for one-click CFO item acceptance. The backend remains authoritative. */
export function cfoAcceptItemKey(item) {
  return `${item?.package_id ?? ''}:${item?.id ?? ''}`;
}

/** Update only the item confirmed by the server; never change other categories or items. */
export function updateCfoCachedAcceptedItem(response, acceptedItem, expectedRowVersion) {
  if (!response?.package || !Array.isArray(response.package.items) || !acceptedItem?.id ||
      acceptedItem.cfo_review_status !== 'CFO_ACCEPTED') return response;
  let changed = false;
  const items = response.package.items.map((item) => {
    if (Number(item.id) !== Number(acceptedItem.id) ||
        String(item.row_version) !== String(expectedRowVersion)) return item;
    changed = true;
    return {
      ...item,
      cfo_review_status: acceptedItem.cfo_review_status,
      cfo_review_note: acceptedItem.cfo_review_note ?? null,
      cfo_reviewed_by: acceptedItem.cfo_reviewed_by,
      cfo_reviewed_at: acceptedItem.cfo_reviewed_at,
      row_version: acceptedItem.row_version,
    };
  });
  return changed ? {...response, package: {...response.package, items}} : response;
}
