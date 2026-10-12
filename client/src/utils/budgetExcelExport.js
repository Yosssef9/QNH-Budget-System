import { saveAs } from "file-saver";
import { strToU8, zipSync } from "fflate";
import { buildApprovedDistribution } from "./approvedDistribution";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const STYLE = Object.freeze({
  DEFAULT: 0,
  TITLE: 1,
  SUBTITLE: 2,
  META_LABEL: 3,
  META_VALUE: 4,
  HEADER: 5,
  BODY_TEXT: 6,
  BODY_CENTER: 7,
  QUANTITY: 8,
  CURRENCY: 9,
  TOTAL_LABEL: 10,
  TOTAL_QUANTITY: 11,
  TOTAL_CURRENCY: 12,
  NOTE: 13,
  STATUS_GOOD: 14,
  STATUS_WARN: 15,
  STATUS_NEUTRAL: 16,
  QUARTER: 17,
  MONTH: 18,
});

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundQuantity(value) {
  return Math.round(toNumber(value) * 10000) / 10000;
}

function nearlyEqual(left, right) {
  return Math.abs(roundQuantity(left) - roundQuantity(right)) < 0.0001;
}

function sanitizeFilePart(value, fallback = "Budget") {
  const normalized = String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");

  return normalized || fallback;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index) {
  let value = Number(index);
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function statusStyle(value) {
  const normalized = String(value || "").toUpperCase();

  if (
    normalized.includes("COMPLETED") ||
    normalized.includes("APPROVED") ||
    normalized === "PRICED" ||
    normalized === "AVAILABLE"
  ) {
    return STYLE.STATUS_GOOD;
  }

  if (
    normalized.includes("PENDING") ||
    normalized.includes("PARTIAL") ||
    normalized.includes("IN_") ||
    normalized.includes("RETURNED")
  ) {
    return STYLE.STATUS_WARN;
  }

  return STYLE.STATUS_NEUTRAL;
}

function makeCell(value, style = STYLE.BODY_TEXT) {
  return { value, style };
}

function makeNumberCell(value, style = STYLE.QUANTITY) {
  if (value === null || value === undefined || value === "") {
    return { value: null, style };
  }

  return { value: toNumber(value), style, type: "number" };
}

function makeStatusCell(value) {
  return { value: value || "-", style: statusStyle(value) };
}

function cellXml(reference, cell) {
  const style = Number.isInteger(cell?.style) ? cell.style : STYLE.DEFAULT;
  const styleAttribute = style ? ` s="${style}"` : "";

  if (cell?.value === null || cell?.value === undefined || cell?.value === "") {
    return `<c r="${reference}"${styleAttribute}/>`;
  }

  if (cell.type === "number") {
    return `<c r="${reference}"${styleAttribute}><v>${Number(cell.value)}</v></c>`;
  }

  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(
    cell.value,
  )}</t></is></c>`;
}

function rowXml(rowNumber, cells, { height = null } = {}) {
  const attributes = height
    ? ` r="${rowNumber}" ht="${height}" customHeight="1"`
    : ` r="${rowNumber}"`;

  return `<row${attributes}>${cells
    .map((cell, index) => cellXml(`${columnName(index + 1)}${rowNumber}`, cell))
    .join("")}</row>`;
}

function blankCells(count, style = STYLE.DEFAULT) {
  return Array.from({ length: count }, () => makeCell(null, style));
}

function projectItemName(name, value) {
  const isProject = value === true || value === 1;
  return isProject ? `${name || "-"} [PROJECT]` : name || "-";
}

function getPeriodMonthIndex(periodType, periodNo) {
  const type = String(periodType || "").toUpperCase();
  const period = Math.max(1, Number(periodNo || 1));

  if (type.includes("MONTH")) {
    return Math.min(11, period - 1);
  }

  if (type.includes("QUART")) {
    return Math.min(11, (period - 1) * 3);
  }

  return 0;
}

function distributeQuantity(item, targetQuantity) {
  const months = Array(12).fill(0);
  const target = toNumber(targetQuantity);
  const requested = toNumber(item?.requested_quantity ?? item?.quantity);
  const approved = item?.category_approved_quantity;
  const requestedDistribution = Array.isArray(item?.distribution)
    ? item.distribution
    : [];

  if (target === 0) return months;

  let effectiveDistribution = requestedDistribution;
  if (
    approved !== null &&
    approved !== undefined &&
    nearlyEqual(target, approved)
  ) {
    effectiveDistribution =
      Array.isArray(item?.approved_distribution) &&
      item.approved_distribution.length
        ? item.approved_distribution
        : buildApprovedDistribution({
            distribution: requestedDistribution,
            requestedQuantity: requested,
            approvedQuantity: target,
            unitCode: item?.unit_code,
            unitName: item?.unit_name,
          });
  }

  if (!effectiveDistribution.length) {
    months[0] = target;
    return months;
  }

  effectiveDistribution.forEach((row) => {
    const monthIndex = getPeriodMonthIndex(row.period_type, row.period_no);
    months[monthIndex] += toNumber(row.quantity);
  });

  return months.map(roundQuantity);
}

function buildDepartmentRows(budget) {
  return (budget?.items || []).map((item, index) => {
    const requestedQuantity = toNumber(item.requested_quantity ?? item.quantity);
    const approvedKnown =
      item.category_approved_quantity !== null &&
      item.category_approved_quantity !== undefined;
    const approvedQuantity = approvedKnown
      ? toNumber(item.category_approved_quantity)
      : null;
    const distributionQuantity = approvedKnown
      ? approvedQuantity
      : requestedQuantity;
    const months = distributeQuantity(item, distributionQuantity);
    const approvedAmount = toNumber(item.approved_amount);
    const isNotApplicable = approvedKnown && approvedQuantity === 0;
    const hasAmount = approvedKnown && approvedQuantity > 0 && approvedAmount > 0;
    const unitPrice = hasAmount ? approvedAmount / approvedQuantity : null;

    return {
      index: index + 1,
      category: item.category_name || "-",
      itemName: projectItemName(
        item.type_name || item.catalog_item_name || "-",
        item.is_project ?? item.isProject,
      ),
      expenseType: item.expense_type || "-",
      unit: item.unit_name || item.unit_code || "Unit",
      requestedQuantity,
      approvedQuantity,
      months,
      unitPrice,
      amount: isNotApplicable ? 0 : hasAmount ? approvedAmount : null,
      note: item.hod_item_note || item.hodItemNote || "",
      reviewStatus: String(item.review_status || "Pending Review").replaceAll(
        "_",
        " ",
      ),
      pricingStatus: isNotApplicable
        ? "Not Applicable"
        : hasAmount
          ? "Available"
          : "Not Available",
    };
  });
}

function categoryItemKey(item) {
  if (item?.catalog_item_id !== null && item?.catalog_item_id !== undefined) {
    return `catalog:${item.catalog_item_id}`;
  }

  return `request:${
    item?.id ??
    item?.department_budget_item_id ??
    `${item?.department_id ?? "department"}:${item?.catalog_item_name ?? "item"}`
  }`;
}

function buildCategoryGroups(departmentItems = []) {
  const groups = new Map();

  departmentItems.forEach((item) => {
    const key = categoryItemKey(item);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        catalogItemId: item.catalog_item_id ?? null,
        itemName: item.catalog_item_name || "-",
        expenseTypes: new Set(),
        units: new Set(),
        projectStates: new Set(),
        departments: new Set(),
        requestedQuantity: 0,
        approvedQuantity: 0,
        months: Array(12).fill(0),
      });
    }

    const group = groups.get(key);
    const requestedQuantity = toNumber(item.requested_quantity);
    const approvedQuantity = toNumber(item.category_approved_quantity);
    const approvedMonths = distributeQuantity(item, approvedQuantity);

    group.requestedQuantity += requestedQuantity;
    group.approvedQuantity += approvedQuantity;
    group.months = group.months.map(
      (value, index) => value + approvedMonths[index],
    );
    group.expenseTypes.add(item.expense_type || "-");
    group.units.add(item.unit_name || item.unit_code || "Unit");
    group.projectStates.add(
      item.is_project === true || item.is_project === 1 || item.isProject === true,
    );
    group.departments.add(String(item.department_id ?? item.department_name));
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      expenseType:
        group.expenseTypes.size === 1
          ? [...group.expenseTypes][0]
          : [...group.expenseTypes].join(" / "),
      unit:
        group.units.size === 1 ? [...group.units][0] : [...group.units].join(" / "),
      itemName: projectItemName(
        group.itemName,
        group.projectStates.size === 1 && [...group.projectStates][0] === true,
      ),
      departmentCount: group.departments.size,
      requestedQuantity: roundQuantity(group.requestedQuantity),
      approvedQuantity: roundQuantity(group.approvedQuantity),
      months: group.months.map(roundQuantity),
    }))
    .sort((left, right) => left.itemName.localeCompare(right.itemName));
}

function choosePackagePrice(subItem) {
  const finalPrice = Number(subItem?.unit_price);
  if (Number.isFinite(finalPrice) && finalPrice > 0) {
    return { value: finalPrice, source: "Purchasing / Final" };
  }

  const categoryManagerPrice = Number(subItem?.category_manager_unit_price);
  if (Number.isFinite(categoryManagerPrice) && categoryManagerPrice > 0) {
    return { value: categoryManagerPrice, source: "Category Manager" };
  }

  return { value: null, source: "Not priced" };
}

function buildPricingFromPackageDetails(packageDetails = []) {
  const pricing = new Map();

  packageDetails.filter(Boolean).forEach((detail) => {
    const packageItem = detail.package_item || {};
    const approvedQuantity = toNumber(packageItem.approved_quantity);
    const subItems = Array.isArray(detail.sub_items) ? detail.sub_items : [];
    let modelQuantity = 0;
    let amount = 0;
    let pricedModels = 0;

    subItems.forEach((subItem) => {
      const quantity = toNumber(subItem.quantity);
      const price = choosePackagePrice(subItem).value;
      modelQuantity += quantity;

      if (quantity <= 0) return;
      if (price !== null) {
        pricedModels += 1;
        amount += quantity * price;
      }
    });

    const positiveModels = subItems.filter((subItem) => toNumber(subItem.quantity) > 0);
    const fullyPriced = positiveModels.every(
      (subItem) => choosePackagePrice(subItem).value !== null,
    );
    const reconciled = nearlyEqual(modelQuantity, approvedQuantity);
    const complete =
      approvedQuantity === 0 ||
      (positiveModels.length > 0 && fullyPriced && reconciled);
    const anyPriced = pricedModels > 0;

    pricing.set(Number(packageItem.catalog_item_id), {
      complete,
      status:
        approvedQuantity === 0
          ? "Not Applicable"
          : complete
            ? "Priced"
            : anyPriced
              ? "Partially Priced"
              : "Not Priced",
      amount: complete ? amount : null,
      unitPrice:
        complete && approvedQuantity > 0 ? amount / approvedQuantity : null,
    });
  });

  return pricing;
}

function buildPricingFromBalanceItems(balanceItems = [], groups = []) {
  const raw = new Map();

  balanceItems.forEach((item) => {
    const catalogItemId = Number(item.catalog_item_id);
    if (!catalogItemId) return;

    if (!raw.has(catalogItemId)) {
      raw.set(catalogItemId, {
        quantity: 0,
        amount: 0,
        positiveModels: 0,
        pricedModels: 0,
      });
    }

    const summary = raw.get(catalogItemId);
    const quantity = toNumber(item.quantity);
    const unitPrice = Number(item.unit_price);
    summary.quantity += quantity;

    if (quantity > 0) {
      summary.positiveModels += 1;
      if (Number.isFinite(unitPrice) && unitPrice > 0) {
        summary.pricedModels += 1;
        summary.amount += quantity * unitPrice;
      }
    }
  });

  const pricing = new Map();

  groups.forEach((group) => {
    const catalogItemId = Number(group.catalogItemId);
    const summary = raw.get(catalogItemId);
    if (!summary) return;

    const complete =
      group.approvedQuantity === 0 ||
      (summary.positiveModels > 0 &&
        summary.positiveModels === summary.pricedModels &&
        nearlyEqual(summary.quantity, group.approvedQuantity));
    const anyPriced = summary.pricedModels > 0;

    pricing.set(catalogItemId, {
      complete,
      status:
        group.approvedQuantity === 0
          ? "Not Applicable"
          : complete
            ? "Priced"
            : anyPriced
              ? "Partially Priced"
              : "Not Priced",
      amount: complete ? summary.amount : null,
      unitPrice:
        complete && group.approvedQuantity > 0
          ? summary.amount / group.approvedQuantity
          : null,
    });
  });

  return pricing;
}

function mergePricing(primary, fallback) {
  const result = new Map(fallback || []);
  (primary || new Map()).forEach((value, key) => result.set(key, value));
  return result;
}

function buildCategoryMainRows({ departmentItems, packageDetails, balanceItems }) {
  const groups = buildCategoryGroups(departmentItems);
  const currentPricing = buildPricingFromPackageDetails(packageDetails);
  const historicalPricing = buildPricingFromBalanceItems(balanceItems, groups);
  const pricing = mergePricing(currentPricing, historicalPricing);

  return groups.map((group, index) => {
    const price = pricing.get(Number(group.catalogItemId)) || {
      complete: false,
      status: "Not Priced",
      amount: null,
      unitPrice: null,
    };

    return {
      index: index + 1,
      ...group,
      unitPrice: price.complete ? price.unitPrice : null,
      amount: price.complete ? price.amount : null,
      pricingStatus: price.status,
    };
  });
}

function buildCategoryDepartmentDetailRows(departmentItems = []) {
  return [...departmentItems]
    .sort((left, right) => {
      const itemCompare = String(left.catalog_item_name || "").localeCompare(
        String(right.catalog_item_name || ""),
      );
      if (itemCompare !== 0) return itemCompare;
      return String(left.department_name || "").localeCompare(
        String(right.department_name || ""),
      );
    })
    .map((item, index) => ({
      index: index + 1,
      itemName: projectItemName(
        item.catalog_item_name || "-",
        item.is_project ?? item.isProject,
      ),
      departmentCode: item.department_code || "-",
      departmentName: item.department_name || "-",
      hodName: item.hod_name || "Not assigned",
      expenseType: item.expense_type || "-",
      unit: item.unit_name || item.unit_code || "Unit",
      requestedQuantity: toNumber(item.requested_quantity),
      approvedQuantity: toNumber(item.category_approved_quantity),
      months: distributeQuantity(item, toNumber(item.category_approved_quantity)),
      reviewStatus: String(item.review_status || "Pending Review").replaceAll(
        "_",
        " ",
      ),
      hodNote: item.hod_item_note || item.hodItemNote || "",
      reviewNote: item.review_note || "",
    }));
}

function normalizeStatus(value) {
  return String(value || "-").replaceAll("_", " ");
}

function total(values) {
  return values.reduce((sum, value) => sum + toNumber(value), 0);
}

function sheetColumnDefinitions(kind) {
  if (kind === "department") {
    return [
      { label: "#", width: 6, type: "center" },
      { label: "Category", width: 20 },
      { label: "Item", width: 38 },
      { label: "Expense", width: 12, type: "center" },
      { label: "Unit", width: 16, type: "center" },
      { label: "Requested Qty", width: 14, type: "quantity" },
      { label: "Approved Qty", width: 14, type: "quantity" },
      ...MONTHS.map((label, index) => ({
        label,
        width: 9,
        type: "quantity",
        month: index,
        quarter: `Q${Math.floor(index / 3) + 1}`,
      })),
      { label: "Unit Price", width: 16, type: "currency" },
      { label: "Amount", width: 18, type: "currency" },
      { label: "HOD Note", width: 34, type: "note" },
      { label: "Review Status", width: 20, type: "status" },
      { label: "Pricing", width: 16, type: "status" },
    ];
  }

  if (kind === "category-main") {
    return [
      { label: "#", width: 6, type: "center" },
      { label: "Item", width: 38 },
      { label: "Expense", width: 12, type: "center" },
      { label: "Unit", width: 16, type: "center" },
      { label: "Departments", width: 13, type: "quantity" },
      { label: "Requested Qty", width: 14, type: "quantity" },
      { label: "Approved Qty", width: 14, type: "quantity" },
      ...MONTHS.map((label, index) => ({
        label,
        width: 9,
        type: "quantity",
        month: index,
        quarter: `Q${Math.floor(index / 3) + 1}`,
      })),
      { label: "Unit Price", width: 16, type: "currency" },
      { label: "Amount", width: 18, type: "currency" },
      { label: "Pricing Status", width: 18, type: "status" },
    ];
  }

  return [
    { label: "#", width: 6, type: "center" },
    { label: "Item", width: 38 },
    { label: "Dept. Code", width: 14 },
    { label: "Department", width: 26 },
    { label: "HOD", width: 24 },
    { label: "Expense", width: 12, type: "center" },
    { label: "Unit", width: 16, type: "center" },
    { label: "Requested Qty", width: 14, type: "quantity" },
    { label: "Approved Qty", width: 14, type: "quantity" },
    ...MONTHS.map((label, index) => ({
      label,
      width: 9,
      type: "quantity",
      month: index,
      quarter: `Q${Math.floor(index / 3) + 1}`,
    })),
    { label: "Review Status", width: 20, type: "status" },
    { label: "HOD Request Note", width: 34, type: "note" },
    { label: "CM Review Note", width: 34, type: "note" },
  ];
}

function departmentDataCells(row) {
  return [
    makeNumberCell(row.index, STYLE.BODY_CENTER),
    makeCell(row.category),
    makeCell(row.itemName),
    makeCell(row.expenseType, STYLE.BODY_CENTER),
    makeCell(row.unit, STYLE.BODY_CENTER),
    makeNumberCell(row.requestedQuantity),
    makeNumberCell(row.approvedQuantity),
    ...row.months.map((value) => makeNumberCell(value)),
    makeNumberCell(row.unitPrice, STYLE.CURRENCY),
    makeNumberCell(row.amount, STYLE.CURRENCY),
    makeCell(row.note, STYLE.NOTE),
    makeStatusCell(row.reviewStatus),
    makeStatusCell(row.pricingStatus),
  ];
}

function categoryMainDataCells(row) {
  return [
    makeNumberCell(row.index, STYLE.BODY_CENTER),
    makeCell(row.itemName),
    makeCell(row.expenseType, STYLE.BODY_CENTER),
    makeCell(row.unit, STYLE.BODY_CENTER),
    makeNumberCell(row.departmentCount),
    makeNumberCell(row.requestedQuantity),
    makeNumberCell(row.approvedQuantity),
    ...row.months.map((value) => makeNumberCell(value)),
    makeNumberCell(row.unitPrice, STYLE.CURRENCY),
    makeNumberCell(row.amount, STYLE.CURRENCY),
    makeStatusCell(row.pricingStatus),
  ];
}

function categoryDetailDataCells(row) {
  return [
    makeNumberCell(row.index, STYLE.BODY_CENTER),
    makeCell(row.itemName),
    makeCell(row.departmentCode),
    makeCell(row.departmentName),
    makeCell(row.hodName),
    makeCell(row.expenseType, STYLE.BODY_CENTER),
    makeCell(row.unit, STYLE.BODY_CENTER),
    makeNumberCell(row.requestedQuantity),
    makeNumberCell(row.approvedQuantity),
    ...row.months.map((value) => makeNumberCell(value)),
    makeStatusCell(row.reviewStatus),
    makeCell(row.hodNote, STYLE.NOTE),
    makeCell(row.reviewNote, STYLE.NOTE),
  ];
}

function buildHeaderRows(columns) {
  const row1 = blankCells(columns.length, STYLE.HEADER);
  const row2 = blankCells(columns.length, STYLE.MONTH);
  const merges = [];
  let index = 0;

  while (index < columns.length) {
    const column = columns[index];

    if (column.month !== undefined) {
      const quarter = column.quarter;
      let end = index;
      while (
        end + 1 < columns.length &&
        columns[end + 1].quarter === quarter
      ) {
        end += 1;
      }

      row1[index] = makeCell(quarter, STYLE.QUARTER);
      for (let pointer = index + 1; pointer <= end; pointer += 1) {
        row1[pointer] = makeCell(null, STYLE.QUARTER);
      }
      merges.push(
        `${columnName(index + 1)}8:${columnName(end + 1)}8`,
      );
      for (let pointer = index; pointer <= end; pointer += 1) {
        row2[pointer] = makeCell(columns[pointer].label, STYLE.MONTH);
      }
      index = end + 1;
      continue;
    }

    row1[index] = makeCell(column.label, STYLE.HEADER);
    row2[index] = makeCell(null, STYLE.HEADER);
    merges.push(`${columnName(index + 1)}8:${columnName(index + 1)}9`);
    index += 1;
  }

  return { row1, row2, merges };
}

function fillStyledRange(cells, startIndex, endIndex, style) {
  for (let index = startIndex; index <= endIndex; index += 1) {
    cells[index] = makeCell(null, style);
  }
}

function formatMetaPair(pair) {
  if (!pair) return "";

  let value = pair.value;
  if (value === null || value === undefined || value === "") {
    value = "-";
  } else if (pair.type === "currency") {
    value = `${toNumber(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} SAR`;
  } else if (pair.type === "quantity") {
    value = toNumber(value).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
  }

  return `${pair.label}: ${value}`;
}

function buildMetaRow(columnCount, frozenColumnCount, pairs) {
  const cells = blankCells(columnCount, STYLE.META_VALUE);
  const merges = [];
  const fixedCount = Math.max(2, Math.min(frozenColumnCount, columnCount));
  const leftEnd = Math.max(0, Math.ceil(fixedCount / 2) - 1);
  const rightStart = leftEnd + 1;
  const fixedEnd = fixedCount - 1;

  const blocks = [
    {
      start: 0,
      end: leftEnd,
      text: pairs.slice(0, 2).map(formatMetaPair).filter(Boolean).join("   •   "),
    },
    {
      start: rightStart,
      end: fixedEnd,
      text: pairs.slice(2, 4).map(formatMetaPair).filter(Boolean).join("   •   "),
    },
  ];

  blocks.forEach((block) => {
    if (block.start >= fixedCount || block.end < block.start) return;

    fillStyledRange(cells, block.start, block.end, STYLE.META_VALUE);
    cells[block.start] = makeCell(block.text || "-", STYLE.META_VALUE);

    if (block.end > block.start) {
      merges.push(
        `${columnName(block.start + 1)}:${columnName(block.end + 1)}`,
      );
    }
  });

  return { cells, merges };
}

function buildSheetDefinition({
  name,
  reportTitle,
  reportSubtitle,
  reportNote,
  metaRowOne,
  metaRowTwo,
  columns,
  dataRows,
  dataCellBuilder,
  totals,
}) {
  const columnCount = columns.length;
  const rows = [];
  const merges = [];
  const firstMonthIndex = columns.findIndex(
    (column) => column.month !== undefined,
  );
  const frozenColumnCount = firstMonthIndex > 0 ? firstMonthIndex : 1;
  const frozenLastColumn = columnName(frozenColumnCount);
  const titleStartIndex = Math.min(3, frozenColumnCount - 1);
  const titleStartColumn = columnName(titleStartIndex + 1);

  const topRowOne = blankCells(columnCount, STYLE.TITLE);
  const topRowTwo = blankCells(columnCount, STYLE.SUBTITLE);
  const topRowThree = blankCells(columnCount, STYLE.SUBTITLE);
  topRowOne[titleStartIndex] = makeCell(reportTitle, STYLE.TITLE);
  topRowTwo[titleStartIndex] = makeCell(reportSubtitle, STYLE.SUBTITLE);
  topRowThree[titleStartIndex] = makeCell(reportNote, STYLE.SUBTITLE);
  rows.push({ number: 1, cells: topRowOne, height: 30 });
  rows.push({ number: 2, cells: topRowTwo, height: 22 });
  rows.push({ number: 3, cells: topRowThree, height: 22 });
  rows.push({ number: 4, cells: blankCells(columnCount), height: 8 });

  merges.push(
    `${titleStartColumn}1:${frozenLastColumn}1`,
    `${titleStartColumn}2:${frozenLastColumn}2`,
    `${titleStartColumn}3:${frozenLastColumn}3`,
  );

  const metaOne = buildMetaRow(columnCount, frozenColumnCount, metaRowOne);
  const metaTwo = buildMetaRow(columnCount, frozenColumnCount, metaRowTwo);
  rows.push({ number: 5, cells: metaOne.cells, height: 24 });
  rows.push({ number: 6, cells: metaTwo.cells, height: 24 });
  rows.push({ number: 7, cells: blankCells(columnCount), height: 8 });

  metaOne.merges.forEach((merge) => {
    const [start, end] = merge.split(":");
    merges.push(`${start}5:${end}5`);
  });
  metaTwo.merges.forEach((merge) => {
    const [start, end] = merge.split(":");
    merges.push(`${start}6:${end}6`);
  });

  const header = buildHeaderRows(columns);
  rows.push({ number: 8, cells: header.row1, height: 24 });
  rows.push({ number: 9, cells: header.row2, height: 22 });
  merges.push(...header.merges);

  dataRows.forEach((row, index) => {
    rows.push({
      number: 10 + index,
      cells: dataCellBuilder(row),
      height: 22,
    });
  });

  const totalRowNumber = 10 + dataRows.length;
  const totalCells = blankCells(columnCount, STYLE.TOTAL_LABEL);
  totalCells[0] = makeCell("TOTAL", STYLE.TOTAL_LABEL);
  if (totals?.cells) {
    Object.entries(totals.cells).forEach(([index, config]) => {
      const numericIndex = Number(index);
      totalCells[numericIndex] = config.type === "currency"
        ? makeNumberCell(config.value, STYLE.TOTAL_CURRENCY)
        : config.type === "quantity"
          ? makeNumberCell(config.value, STYLE.TOTAL_QUANTITY)
          : makeCell(config.value, STYLE.TOTAL_LABEL);
    });
  }
  rows.push({ number: totalRowNumber, cells: totalCells, height: 24 });

  const totalMergeEnd = Math.max(0, Number(totals?.labelMergeEnd ?? 2));
  if (totalMergeEnd > 0) {
    merges.push(`A${totalRowNumber}:${columnName(totalMergeEnd + 1)}${totalRowNumber}`);
  }

  return {
    name,
    columns,
    rows,
    merges,
    freeze: {
      xSplit: frozenColumnCount,
      ySplit: 9,
      topLeftCell: `${columnName(frozenColumnCount + 1)}10`,
    },
    lastDataRow: totalRowNumber,
  };
}

function buildDepartmentSheet(budget) {
  const rows = buildDepartmentRows(budget);
  const columns = sheetColumnDefinitions("department");
  const months = MONTHS.map((_, index) => total(rows.map((row) => row.months[index])));
  const totalAmount = total(rows.map((row) => row.amount));
  const applicableRows = rows.filter(
    (row) => row.pricingStatus !== "Not Applicable",
  );
  const fullyPriced =
    applicableRows.length > 0 &&
    applicableRows.every((row) => row.pricingStatus === "Available");
  const anyPriced = rows.some((row) => row.pricingStatus === "Available");
  const pricingLabel = fullyPriced
    ? "Available"
    : anyPriced
      ? "Partially available"
      : "Not yet available";

  return buildSheetDefinition({
    name: "Department Budget",
    reportTitle: "QNH HOSPITAL – DEPARTMENT BUDGET REPORT",
    reportSubtitle: `${budget?.department_name || "Department"} · FY ${budget?.financial_year || "-"}`,
    reportNote: "",
    metaRowOne: [
      { label: "Department", value: budget?.department_name || "-" },
      { label: "Financial Year", value: budget?.financial_year || "-" },
      { label: "Budget Status", value: normalizeStatus(budget?.status) },
      { label: "Pricing", value: pricingLabel },
    ],
    metaRowTwo: [
      { label: "Exported", value: new Date().toLocaleString() },
      { label: "Items", value: rows.length, type: "quantity" },
      {
        label: "Requested Qty",
        value: total(rows.map((row) => row.requestedQuantity)),
        type: "quantity",
      },
      {
        label: "Total Amount",
        value: fullyPriced ? totalAmount : null,
        type: "currency",
      },
    ],
    columns,
    dataRows: rows,
    dataCellBuilder: departmentDataCells,
    totals: {
      labelMergeEnd: 4,
      cells: {
        5: { value: total(rows.map((row) => row.requestedQuantity)), type: "quantity" },
        6: { value: total(rows.map((row) => row.approvedQuantity)), type: "quantity" },
        ...Object.fromEntries(
          months.map((value, index) => [7 + index, { value, type: "quantity" }]),
        ),
        20: { value: fullyPriced ? totalAmount : null, type: "currency" },
      },
    },
  });
}

function buildCategoryMainSheet({
  categoryName,
  financialYear,
  packageStatus,
  departmentItems,
  packageDetails,
  balanceItems,
}) {
  const rows = buildCategoryMainRows({
    departmentItems,
    packageDetails,
    balanceItems,
  });
  const columns = sheetColumnDefinitions("category-main");
  const months = MONTHS.map((_, index) => total(rows.map((row) => row.months[index])));
  const totalAmount = total(rows.map((row) => row.amount));
  const pricedRows = rows.filter((row) => row.pricingStatus !== "Not Applicable");
  const fullyPriced =
    pricedRows.length > 0 &&
    pricedRows.every((row) => row.pricingStatus === "Priced");
  const anyPriced = rows.some((row) => row.pricingStatus === "Priced");
  const pricingLabel = fullyPriced
    ? "Fully priced"
    : anyPriced
      ? "Partially priced"
      : "Not yet priced";

  return buildSheetDefinition({
    name: "Category Budget",
    reportTitle: "QNH HOSPITAL – CATEGORY BUDGET REPORT",
    reportSubtitle: `${categoryName || "Category"} · FY ${financialYear?.year || "-"}`,
    reportNote: "",
    metaRowOne: [
      { label: "Category", value: categoryName || "-" },
      { label: "Financial Year", value: financialYear?.year || "-" },
      { label: "Package Status", value: normalizeStatus(packageStatus) },
      { label: "Pricing", value: pricingLabel },
    ],
    metaRowTwo: [
      { label: "Exported", value: new Date().toLocaleString() },
      { label: "Items", value: rows.length, type: "quantity" },
      {
        label: "Approved Qty",
        value: total(rows.map((row) => row.approvedQuantity)),
        type: "quantity",
      },
      {
        label: "Total Amount",
        value: fullyPriced ? totalAmount : null,
        type: "currency",
      },
    ],
    columns,
    dataRows: rows,
    dataCellBuilder: categoryMainDataCells,
    totals: {
      labelMergeEnd: 4,
      cells: {
        5: { value: total(rows.map((row) => row.requestedQuantity)), type: "quantity" },
        6: { value: total(rows.map((row) => row.approvedQuantity)), type: "quantity" },
        ...Object.fromEntries(
          months.map((value, index) => [7 + index, { value, type: "quantity" }]),
        ),
        20: { value: fullyPriced ? totalAmount : null, type: "currency" },
      },
    },
  });
}

function buildCategoryDepartmentDetailsSheet({
  categoryName,
  financialYear,
  departmentItems,
}) {
  const rows = buildCategoryDepartmentDetailRows(departmentItems);
  const columns = sheetColumnDefinitions("category-details");
  const months = MONTHS.map((_, index) => total(rows.map((row) => row.months[index])));

  return buildSheetDefinition({
    name: "Department Details",
    reportTitle: "QNH HOSPITAL – DEPARTMENT DEMAND DETAILS",
    reportSubtitle: `${categoryName || "Category"} · FY ${financialYear?.year || "-"}`,
    reportNote: "",
    metaRowOne: [
      { label: "Category", value: categoryName || "-" },
      { label: "Financial Year", value: financialYear?.year || "-" },
      {
        label: "Departments",
        value: new Set(rows.map((row) => row.departmentName)).size,
        type: "quantity",
      },
      { label: "Rows", value: rows.length, type: "quantity" },
    ],
    metaRowTwo: [
      { label: "Exported", value: new Date().toLocaleString() },
      {
        label: "Requested Qty",
        value: total(rows.map((row) => row.requestedQuantity)),
        type: "quantity",
      },
      {
        label: "Approved Qty",
        value: total(rows.map((row) => row.approvedQuantity)),
        type: "quantity",
      },
      { label: "Currency", value: "SAR" },
    ],
    columns,
    dataRows: rows,
    dataCellBuilder: categoryDetailDataCells,
    totals: {
      labelMergeEnd: 6,
      cells: {
        7: { value: total(rows.map((row) => row.requestedQuantity)), type: "quantity" },
        8: { value: total(rows.map((row) => row.approvedQuantity)), type: "quantity" },
        ...Object.fromEntries(
          months.map((value, index) => [9 + index, { value, type: "quantity" }]),
        ),
      },
    },
  });
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0.####"/>
    <numFmt numFmtId="165" formatCode="#,##0.00 &quot;SAR&quot;"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="20"/><name val="Aptos Display"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font>
    <font><b/><color rgb="FF0F172A"/><sz val="10"/><name val="Aptos"/></font>
    <font><b/><color rgb="FF166534"/><sz val="10"/><name val="Aptos"/></font>
    <font><b/><color rgb="FF92400E"/><sz val="10"/><name val="Aptos"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B2A4A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F4C81"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F1F8"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7ED"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD7E0E8"/></left>
      <right style="thin"><color rgb="FFD7E0E8"/></right>
      <top style="thin"><color rgb="FFD7E0E8"/></top>
      <bottom style="thin"><color rgb="FFD7E0E8"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="19">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="164" fontId="2" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="2" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function worksheetXml(sheet, drawingRelId = null) {
  const columnsXml = sheet.columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`,
    )
    .join("");
  const rowContent = sheet.rows
    .map((row) => rowXml(row.number, row.cells, { height: row.height }))
    .join("");
  const mergeXml = sheet.merges.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
        .map((range) => `<mergeCell ref="${range}"/>`)
        .join("")}</mergeCells>`
    : "";
  const drawingXml = drawingRelId ? `<drawing r:id="${drawingRelId}"/>` : "";
  const { xSplit, ySplit, topLeftCell } = sheet.freeze;
  const firstScrollableColumn = columnName(xSplit + 1);
  const firstDataRow = ySplit + 1;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:${columnName(sheet.columns.length)}${sheet.lastDataRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="0">
      <pane xSplit="${xSplit}" ySplit="${ySplit}" topLeftCell="${topLeftCell}" activePane="bottomRight" state="frozen"/>
      <selection pane="topRight" activeCell="${firstScrollableColumn}1" sqref="${firstScrollableColumn}1"/>
      <selection pane="bottomLeft" activeCell="A${firstDataRow}" sqref="A${firstDataRow}"/>
      <selection pane="bottomRight" activeCell="${firstScrollableColumn}${firstDataRow}" sqref="${firstScrollableColumn}${firstDataRow}"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columnsXml}</cols>
  <sheetData>${rowContent}</sheetData>
  ${mergeXml}
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
  ${drawingXml}
</worksheet>`;
}

function drawingXml(sheetIndex) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:oneCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>120000</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>80000</xdr:rowOff></xdr:from>
    <xdr:ext cx="2150000" cy="820000"/>
    <xdr:pic>
      <xdr:nvPicPr><xdr:cNvPr id="${sheetIndex + 1}" name="QNH Logo"/><xdr:cNvPicPr/></xdr:nvPicPr>
      <xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;
}

function workbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets>${sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("")}</sheets>
  <calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;
}

function workbookRelationshipsXml(sheetCount) {
  const relationships = Array.from({ length: sheetCount }, (_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  );
  relationships.push(
    `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
  );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`;
}

function contentTypesXml(sheetCount, withLogo) {
  const overrides = Array.from({ length: sheetCount }, (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  );
  const drawingOverrides = withLogo
    ? Array.from({ length: sheetCount }, (_, index) =>
        `<Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
      )
    : [];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${withLogo ? '<Default Extension="png" ContentType="image/png"/>' : ""}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${overrides.join("")}
  ${drawingOverrides.join("")}
</Types>`;
}

function rootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function appPropertiesXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>QNH Budget System</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets
    .map((sheet) => `<vt:lpstr>${xmlEscape(sheet.name)}</vt:lpstr>`)
    .join("")}</vt:vector></TitlesOfParts>
  <Company>QNH Hospital</Company>
  <AppVersion>1.0</AppVersion>
</Properties>`;
}

function corePropertiesXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>QNH Budget Export</dc:title>
  <dc:creator>QNH Budget System</dc:creator>
  <cp:lastModifiedBy>QNH Budget System</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function sheetRelationshipXml(sheetIndex) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${sheetIndex + 1}.xml"/>
</Relationships>`;
}

function drawingRelationshipXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`;
}

async function loadQnhLogo() {
  if (typeof fetch !== "function") return null;

  const base = import.meta.env.BASE_URL || "/";
  const candidates = [
    `${base}images/fullLogo.png`,
    `${base}companies/qnh-logo.png`,
    `${base}images/logo.png`,
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isPng =
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;

      if (isPng) return bytes;
    } catch {
      // Export still works when the logo asset cannot be loaded.
    }
  }

  return null;
}

async function buildWorkbookBlob(sheets) {
  const logo = await loadQnhLogo();
  const withLogo = Boolean(logo);
  const files = {
    "[Content_Types].xml": strToU8(contentTypesXml(sheets.length, withLogo)),
    "_rels/.rels": strToU8(rootRelationshipsXml()),
    "docProps/app.xml": strToU8(appPropertiesXml(sheets)),
    "docProps/core.xml": strToU8(corePropertiesXml()),
    "xl/workbook.xml": strToU8(workbookXml(sheets)),
    "xl/_rels/workbook.xml.rels": strToU8(
      workbookRelationshipsXml(sheets.length),
    ),
    "xl/styles.xml": strToU8(stylesXml()),
  };

  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
      worksheetXml(sheet, withLogo ? "rId1" : null),
    );

    if (withLogo) {
      files[`xl/worksheets/_rels/sheet${index + 1}.xml.rels`] = strToU8(
        sheetRelationshipXml(index),
      );
      files[`xl/drawings/drawing${index + 1}.xml`] = strToU8(
        drawingXml(index),
      );
      files[`xl/drawings/_rels/drawing${index + 1}.xml.rels`] = strToU8(
        drawingRelationshipXml(),
      );
    }
  });

  if (withLogo) {
    files["xl/media/image1.png"] = logo;
  }

  const bytes = zipSync(files, { level: 6 });
  return new Blob([bytes], { type: XLSX_MIME });
}

export async function exportDepartmentBudgetToExcel({ budget }) {
  if (!budget) throw new Error("Budget data is required for Excel export");

  const workbook = await buildWorkbookBlob([buildDepartmentSheet(budget)]);
  const fileName = `QNH_Department_Budget_${sanitizeFilePart(
    budget.department_name,
    "Department",
  )}_FY${sanitizeFilePart(budget.financial_year, "Year")}.xlsx`;

  saveAs(workbook, fileName);
}

export async function exportCategoryBudgetToExcel({
  categoryName,
  financialYear,
  packageStatus,
  departmentItems = [],
  packageDetails = [],
  balanceItems = [],
}) {
  const sheets = [
    buildCategoryMainSheet({
      categoryName,
      financialYear,
      packageStatus,
      departmentItems,
      packageDetails,
      balanceItems,
    }),
    buildCategoryDepartmentDetailsSheet({
      categoryName,
      financialYear,
      departmentItems,
    }),
  ];

  const workbook = await buildWorkbookBlob(sheets);
  const fileName = `QNH_Category_Budget_${sanitizeFilePart(
    categoryName,
    "Category",
  )}_FY${sanitizeFilePart(financialYear?.year, "Year")}.xlsx`;

  saveAs(workbook, fileName);
}
