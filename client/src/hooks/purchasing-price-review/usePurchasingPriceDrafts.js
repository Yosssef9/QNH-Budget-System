import { useCallback, useEffect, useMemo, useState } from "react";

function flattenPrices(packageDetail) {
  return (packageDetail?.items || []).flatMap((item) =>
    (item.sub_items || []).map((subItem) => ({
      ...subItem,
      generic_item_id: item.id,
      generic_item_name: item.catalog_item_name,
      generic_item_code: item.catalog_item_code,
      cfo_review_status: item.cfo_review_status,
    })),
  );
}

export default function usePurchasingPriceDrafts(packageDetail) {
  const rows = useMemo(() => flattenPrices(packageDetail), [packageDetail]);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts({});
  }, [packageDetail?.package?.id]);

  useEffect(() => {
    setDrafts((current) => {
      const next = {};
      let changed = false;

      for (const [rowId, draft] of Object.entries(current)) {
        const serverRow = rows.find((row) => String(row.id) === String(rowId));
        if (
          !serverRow ||
          Number(draft.value) === Number(serverRow.purchasing_unit_price)
        ) {
          changed = true;
          continue;
        }
        next[rowId] = draft;
      }

      return changed ? next : current;
    });
  }, [rows]);

  const updateDraft = useCallback((row, value) => {
    setDrafts((current) => ({
      ...current,
      [row.id]: {
        value,
        row_version: row.row_version,
      },
    }));
  }, []);

  const clearDrafts = useCallback(() => setDrafts({}), []);
  const rowsWithDrafts = useMemo(
    () =>
      rows.map((row) => {
        const draftValue = drafts[row.id]?.value ?? row.purchasing_unit_price ?? "";
        return {
          ...row,
          draft_purchasing_unit_price: draftValue,
          is_dirty:
            drafts[row.id] !== undefined &&
            Number(draftValue) !== Number(row.purchasing_unit_price),
        };
      }),
    [drafts, rows],
  );
  const dirtyRows = useMemo(
    () => rowsWithDrafts.filter((row) => row.is_dirty),
    [rowsWithDrafts],
  );

  return {
    rows: rowsWithDrafts,
    dirtyRows,
    updateDraft,
    clearDrafts,
  };
}
