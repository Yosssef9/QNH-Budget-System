import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { createRow } from "./budgetRows.helper";

export function downloadBudgetTemplate(types) {
  const rows = types.map((type) => ({
    Type_ID: type.id,
    Category: type.category_name,
    Item: type.name,
    Quantity: "",
    Unit_Price: "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { hidden: true },
    { wch: 30 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
  ];
  const workbook = XLSX.utils.book_new();

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ["Budget Import Instructions"],
    [],
    ["1. Only edit Quantity and Unit Price"],
    ["2. Do NOT modify Category names"],
    ["3. Do NOT modify Item names"],
    ["4. Leave unused items blank"],
    ["5. One row = one budget item"],
    ["6. Import the file back into Budget Entry"],
    [],
    ["IMPORTANT:"],
    [
      "Changing Category or Item names will cause the row to be rejected during import.",
    ],
  ]);

  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  XLSX.utils.book_append_sheet(workbook, worksheet, "Budget Template");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const file = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(file, `Budget_Template_${new Date().getFullYear()}.xlsx`);
}

export async function importBudgetTemplate({ file, rows, allTypes }) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
  });

  const sheet =
    workbook.Sheets["Budget Template"] ||
    workbook.Sheets[workbook.SheetNames[1]];

  const excelRows = XLSX.utils.sheet_to_json(sheet);

  const existingTypeIds = new Set(rows.map((r) => Number(r.item)));

  const importedRows = [];
  const errors = [];

  let successCount = 0;

  excelRows.forEach((row, index) => {
    const rowNumber = index + 2;

    const typeId = Number(row.Type_ID);

    const rawQuantity = row.Quantity;

    const rawUnitPrice = row.Unit_Price;

    const quantity = Number(rawQuantity);

    const unitPrice = Number(rawUnitPrice);

    const isEmpty =
      (row.Quantity === undefined || row.Quantity === "") &&
      (row.Unit_Price === undefined || row.Unit_Price === "");

    if (isEmpty) return;

    const matchedType = allTypes.find((t) => Number(t.id) === typeId);

    if (!matchedType) {
      errors.push({
        row: rowNumber,
        item: row.Item || "",
        message: "Item not found",
      });

      return;
    }
    const excelCategory = String(row.Category || "").trim();

    const excelItem = String(row.Item || "").trim();

    const systemCategory = String(matchedType.category_name || "").trim();

    const systemItem = String(matchedType.name || "").trim();

   if (
  excelCategory.toLowerCase() !==
  systemCategory.toLowerCase()
) {
  errors.push({
    row: rowNumber,
    item: excelItem || systemItem,
    message: `Category was modified. Expected "${systemCategory}"`,
  });

  return;
}

if (
  excelItem.toLowerCase() !==
  systemItem.toLowerCase()
) {
  errors.push({
    row: rowNumber,
    item: excelItem || systemItem,
    message: `Item was modified. Expected "${systemItem}"`,
  });

  return;
}
    if (existingTypeIds.has(typeId)) {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: "Item already exists",
      });

      return;
    }
    if (
      rawQuantity !== undefined &&
      rawQuantity !== "" &&
      Number.isNaN(quantity)
    ) {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: `Invalid quantity value "${rawQuantity}"`,
      });

      return;
    }

    if (
      rawUnitPrice !== undefined &&
      rawUnitPrice !== "" &&
      Number.isNaN(unitPrice)
    ) {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: `Invalid unit price value "${rawUnitPrice}"`,
      });

      return;
    }
    if (!quantity || quantity <= 0) {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: "Quantity must be greater than zero",
      });

      return;
    }

    if (!unitPrice || unitPrice <= 0) {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: "Unit price must be greater than zero",
      });

      return;
    }

    importedRows.push(
      createRow(
        `excel-${Date.now()}-${typeId}-${index}`,
        matchedType.category_id,
        matchedType.id,
        "MONTHLY",
        quantity,
        unitPrice,
        Array(12).fill(0),
        Array(4).fill(0),
        true,
      ),
    );

    existingTypeIds.add(typeId);

    successCount++;
  });

  return {
    importedRows,
    errors,
    successCount,
    errorCount: errors.length,
  };
}
