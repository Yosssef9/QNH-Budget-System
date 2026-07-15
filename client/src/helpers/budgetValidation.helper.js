import { getDistributedQuantity } from "./budgetCalculations.helper";
import { toNumber } from "../utils/number";
export function getDuplicateTypeRowIds(rows) {
  const seen = new Map();
  const duplicateIds = new Set();

  rows.forEach((row) => {
    if (!row.item) return;

    const key = String(row.item);

    if (seen.has(key)) {
      duplicateIds.add(seen.get(key));
      duplicateIds.add(row.id);
    } else {
      seen.set(key, row.id);
    }
  });

  return duplicateIds;
}
export function validateRowsDetailed(rows) {
  const usedTypes = new Set();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    if (row.item) {
      const key = String(row.item);

      if (usedTypes.has(key)) {
      return `Row ${rowNumber}: This catalog item is already added in this category budget`;
      }

      usedTypes.add(key);
    }
    if (!row.category) {
      return `Row ${rowNumber}: Please select category`;
    }

    if (!row.item) {
      return `Row ${rowNumber}: Please select catalog item`;
    }

    if (toNumber(row.quantity) <= 0) {
      return `Row ${rowNumber}: Quantity must be greater than 0`;
    }

    if (row.method !== "ANNUAL") {
      const distributed = getDistributedQuantity(row);

      if (distributed !== toNumber(row.quantity)) {
        return `Row ${rowNumber}: Distribution does not match total quantity`;
      }
    }
  }

  return null; // valid
}
