import { createRow } from "./budgetRows.helper";

export async function downloadBudgetTemplate(types) {
  const XLSX = await import("xlsx");
  const { saveAs } = await import("file-saver");
  const rows = types.map((type) => ({
    Category_ID: type.category_id,
    Category: type.category_name,
    Catalog_Item_ID: type.id,
    Item_Code: type.item_code || type.code || "",
    Item: type.name,
    Requested_Quantity: "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { hidden: true },
    { wch: 30 },
    { hidden: true },
    { wch: 18 },
    { wch: 44 },
    { wch: 15 },
  ];
  const workbook = XLSX.utils.book_new();

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ["Budget Import Instructions"],
    [],
    ["1. Only edit Requested_Quantity"],
    ["2. Do NOT modify Category names"],
    ["3. Do NOT modify Catalog_Item_ID, Item_Code, or Item names"],
    ["4. Leave unused items blank"],
    ["5. One row = one budget item"],
    ["6. Import the file back into Budget Entry"],
    [],
    ["IMPORTANT:"],
    [
      "Changing Category, Catalog_Item_ID, Item_Code, or Item names will cause the row to be rejected during import.",
    ],
    [
      "Unit price, amount, vendor, model, package sub-item, and distribution fields are not part of Department Budget Entry.",
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

export async function importBudgetTemplate({
  file,
  rows,
  allTypes,
  categoryBudgets = [],
}) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
  });

  const sheet =
    workbook.Sheets["Budget Template"] ||
    workbook.Sheets[workbook.SheetNames[1]];

  const excelRows = XLSX.utils.sheet_to_json(sheet);

  const existingTypeIds = new Set(rows.map((r) => Number(r.item)));
  const categoryBudgetByCategoryId = new Map(
    categoryBudgets.map((categoryBudget) => [
      Number(categoryBudget.category_id),
      categoryBudget,
    ]),
  );

  const importedRows = [];
  const errors = [];

  let successCount = 0;

  excelRows.forEach((row, index) => {
    const rowNumber = index + 2;

    const typeId = Number(row.Catalog_Item_ID ?? row.Type_ID);

    const rawQuantity = row.Requested_Quantity ?? row.Quantity;

    const quantity = Number(rawQuantity);

    const isEmpty = rawQuantity === undefined || rawQuantity === "";

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
    const excelItemCode = String(row.Item_Code || "").trim();
    const excelCategoryId = Number(row.Category_ID ?? matchedType.category_id);

    const systemCategory = String(matchedType.category_name || "").trim();

    const systemItem = String(matchedType.name || "").trim();
    const systemItemCode = String(
      matchedType.item_code || matchedType.code || "",
    ).trim();

    if (excelCategory.toLowerCase() !== systemCategory.toLowerCase()) {
      errors.push({
        row: rowNumber,
        item: excelItem || systemItem,
        message: `Category was modified. Expected "${systemCategory}"`,
      });

      return;
    }

    const matchedCategoryBudget = categoryBudgetByCategoryId.get(
      Number(matchedType.category_id),
    );

    if (!matchedCategoryBudget) {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: "No department category budget exists for this category",
      });

      return;
    }

    if (matchedCategoryBudget.status !== "DRAFT") {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: `${matchedType.category_name} category budget is read-only`,
      });

      return;
    }

    if (Number(excelCategoryId) !== Number(matchedType.category_id)) {
      errors.push({
        row: rowNumber,
        item: excelItem || systemItem,
        message: `Category ID was modified. Expected "${matchedType.category_id}"`,
      });

      return;
    }

    if (excelItem.toLowerCase() !== systemItem.toLowerCase()) {
      errors.push({
        row: rowNumber,
        item: excelItem || systemItem,
        message: `Item was modified. Expected "${systemItem}"`,
      });

      return;
    }

    if (
      systemItemCode &&
      excelItemCode.toLowerCase() !== systemItemCode.toLowerCase()
    ) {
      errors.push({
        row: rowNumber,
        item: excelItem || systemItem,
        message: `Item code was modified. Expected "${systemItemCode}"`,
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

    if (!quantity || quantity <= 0) {
      errors.push({
        row: rowNumber,
        item: matchedType.name,
        message: "Quantity must be greater than zero",
      });

      return;
    }

    importedRows.push(
      createRow(
        `excel-${Date.now()}-${typeId}-${index}`,
        matchedType.category_id,
        matchedType.id,
        "ANNUAL",
        quantity,
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
