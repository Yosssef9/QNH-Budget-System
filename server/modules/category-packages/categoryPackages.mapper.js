import { RECONCILIATION_STATUS } from "./categoryPackages.constants.js";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function diff(approved, allocated) {
  return Math.round((toNumber(approved) - toNumber(allocated)) * 10000) / 10000;
}

export function getReconciliationStatus({
  approvedQuantity,
  allocatedQuantity,
  needsReconciliation,
  hasSubItems = true,
}) {
  if (!hasSubItems && toNumber(approvedQuantity) > 0) {
    return RECONCILIATION_STATUS.NOT_CONFIGURED;
  }

  if (needsReconciliation) {
    return RECONCILIATION_STATUS.NEEDS_RECONCILIATION;
  }

  const difference = diff(approvedQuantity, allocatedQuantity);
  if (difference > 0) return RECONCILIATION_STATUS.SHORT;
  if (difference < 0) return RECONCILIATION_STATUS.EXCESS;
  return RECONCILIATION_STATUS.RECONCILED;
}

export function mapPackage(packageRow, packageItems = []) {
  if (!packageRow) return null;

  const totals = packageItems.reduce(
    (accumulator, item) => {
      accumulator.requestedQuantity += item.requested_quantity;
      accumulator.approvedQuantity += item.approved_quantity;
      accumulator.allocatedQuantity += item.allocated_quantity;
      if (item.reconciliation_status !== RECONCILIATION_STATUS.RECONCILED) {
        accumulator.blockerCount += 1;
      }
      return accumulator;
    },
    {
      requestedQuantity: 0,
      approvedQuantity: 0,
      allocatedQuantity: 0,
      blockerCount: 0,
      departmentCoverage: {
        totalDepartments: Number(packageRow.total_department_count || 0),
        submittedDepartments: Number(packageRow.submitted_department_count || 0),
        notSubmittedDepartments: Number(
          packageRow.not_submitted_department_count || 0,
        ),
        inReviewDepartments: Number(packageRow.in_review_department_count || 0),
        completedDepartments: Number(packageRow.completed_department_count || 0),
      },
    },
  );

  return {
    id: packageRow.id,
    financial_year_id: packageRow.financial_year_id,
    financial_year: packageRow.financial_year,
    financial_year_status: packageRow.financial_year_status,
    financial_year_cfo_review_finalized_at:
      packageRow.financial_year_cfo_review_finalized_at ?? null,
    financial_year_cfo_review_finalized_by:
      packageRow.financial_year_cfo_review_finalized_by ?? null,
    financial_year_cfo_review_finalized_by_name:
      packageRow.financial_year_cfo_review_finalized_by_name ?? null,
    budget_category_id: packageRow.budget_category_id,
    category_code: packageRow.category_code,
    category_name: packageRow.category_name,
    status: packageRow.status,
    row_version: packageRow.row_version,
    submitted_to_cfo_by: packageRow.submitted_to_cfo_by,
    submitted_to_cfo_by_name: packageRow.submitted_to_cfo_by_name,
    submitted_to_cfo_at: packageRow.submitted_to_cfo_at,
    returned_by_cfo: packageRow.returned_by_cfo,
    returned_by_cfo_name: packageRow.returned_by_cfo_name,
    returned_at: packageRow.returned_at,
    return_reason: packageRow.return_reason,
    submission_window: {
      id: packageRow.submission_window_id,
      status: packageRow.submission_window_status,
      closed_at: packageRow.submission_window_closed_at,
      close_reason: packageRow.submission_window_close_reason,
    },
    summary: totals,
    items: packageItems,
  };
}

export function mapPackageItem(row, subItems = []) {
  const requestedQuantity = toNumber(row.requested_quantity);
  const approvedQuantity = toNumber(row.approved_quantity);
  const allocatedQuantity = toNumber(row.allocated_quantity);
  const remainingQuantity = diff(approvedQuantity, allocatedQuantity);
  const activeSubItemCount =
    subItems.length > 0
      ? subItems.length
      : Number(row.active_sub_item_count || 0);

  return {
    id: row.id,
    category_budget_package_id: row.category_budget_package_id,
    catalog_item_id: row.catalog_item_id,
    catalog_item_name: row.catalog_item_name,
    catalog_item_code: row.catalog_item_code,
    cfo_review_status: row.cfo_review_status,
    cfo_review_note: row.cfo_review_note,
    needs_reconciliation: Boolean(row.needs_reconciliation),
    row_version: row.row_version,
    department_count: Number(row.department_count || 0),
    active_sub_item_count: activeSubItemCount,
    requested_quantity: requestedQuantity,
    approved_quantity: approvedQuantity,
    allocated_quantity: allocatedQuantity,
    remaining_quantity: remainingQuantity,
    estimated_total:
      row.estimated_total === null || row.estimated_total === undefined
        ? subItems.reduce(
            (sum, subItem) =>
              sum + toNumber(subItem.quantity) * toNumber(subItem.unit_price),
            0,
          )
        : toNumber(row.estimated_total),
    reconciliation_status: getReconciliationStatus({
      approvedQuantity,
      allocatedQuantity,
      needsReconciliation: Boolean(row.needs_reconciliation),
      hasSubItems: activeSubItemCount > 0,
    }),
  };
}

export function mapPackageSubItem(row, allocations = []) {
  const quantity = toNumber(row.quantity);
  const unitPrice = row.unit_price === null ? null : toNumber(row.unit_price);

  return {
    id: row.id,
    category_budget_package_item_id: row.category_budget_package_item_id,
    catalog_sub_item_id: row.catalog_sub_item_id,
    sub_item_code: row.sub_item_code,
    name: row.name,
    specification: row.specification,
    unit_of_measure_id: row.unit_of_measure_id,
    unit_of_measure_name: row.unit_of_measure_name,
    unit_of_measure_code: row.unit_of_measure_code,
    quantity,
    unit_price: unitPrice,
    line_total: unitPrice === null ? null : quantity * unitPrice,
    note: row.note,
    is_default_general: Boolean(row.is_default_general),
    attachment_count: Number(row.attachment_count || 0),
    row_version: row.row_version,
    allocations,
  };
}

export function mapDepartmentDemand(row, allocations = []) {
  const approvedQuantity = toNumber(row.category_approved_quantity);
  const allocatedQuantity = allocations.reduce(
    (sum, allocation) => sum + toNumber(allocation.allocated_quantity),
    0,
  );
  const remainingQuantity = diff(approvedQuantity, allocatedQuantity);

  return {
    department_item_id: row.department_item_id,
    department_category_budget_id: row.department_category_budget_id,
    department_id: row.department_id,
    department_name: row.department_name,
    department_code: row.department_code,
    catalog_item_id: row.catalog_item_id,
    requested_quantity: toNumber(row.requested_quantity),
    approved_quantity: approvedQuantity,
    allocated_quantity: allocatedQuantity,
    remaining_quantity: remainingQuantity,
    review_note: row.review_note,
    row_version: row.row_version,
    reconciliation_status:
      remainingQuantity > 0
        ? RECONCILIATION_STATUS.SHORT
        : remainingQuantity < 0
          ? RECONCILIATION_STATUS.EXCESS
          : RECONCILIATION_STATUS.RECONCILED,
    allocations,
  };
}

export function mapPackageItemDetail({
  packageItem,
  subItems,
  departments,
  allocations,
}) {
  const allocationRows = allocations || [];

  const allocationsByDepartment = new Map();
  const allocationsBySubItem = new Map();

  for (const allocation of allocationRows) {
    if (
      !allocationsByDepartment.has(
        allocation.department_category_budget_item_id,
      )
    ) {
      allocationsByDepartment.set(
        allocation.department_category_budget_item_id,
        [],
      );
    }
    allocationsByDepartment
      .get(allocation.department_category_budget_item_id)
      .push(allocation);

    if (
      !allocationsBySubItem.has(allocation.category_budget_package_sub_item_id)
    ) {
      allocationsBySubItem.set(
        allocation.category_budget_package_sub_item_id,
        [],
      );
    }
    allocationsBySubItem
      .get(allocation.category_budget_package_sub_item_id)
      .push(allocation);
  }

  const mappedSubItems = subItems.map((subItem) =>
    mapPackageSubItem(subItem, allocationsBySubItem.get(subItem.id) || []),
  );

  const mappedDepartments = departments.map((department) =>
    mapDepartmentDemand(
      department,
      allocationsByDepartment.get(department.department_item_id) || [],
    ),
  );

  return {
    package_item: mapPackageItem(packageItem, mappedSubItems),
    sub_items: mappedSubItems,
    departments: mappedDepartments,
  };
}

export function mapPackageSubItemAttachment(row) {
  if (!row) return null;

  return {
    id: row.id,
    package_sub_item_id: row.category_budget_package_sub_item_id,
    document_type: row.document_type,
    original_file_name: row.original_file_name,
    mime_type: row.mime_type,
    file_size_bytes: Number(row.file_size_bytes || 0),
    description: row.description,
    uploaded_by: row.uploaded_by,
    uploaded_by_name: row.uploaded_by_name,
    uploaded_at: row.uploaded_at,
    row_version: row.row_version,
  };
}

export function mapDepartmentPackageView(rows = []) {
  const departmentMap = new Map();

  for (const row of rows) {
    const departmentId = Number(row.department_id);
    const departmentItemId = Number(row.department_item_id);

    if (!departmentMap.has(departmentId)) {
      departmentMap.set(departmentId, {
        department_id: row.department_id,
        department_name: row.department_name,
        department_code: row.department_code || null,
        items: new Map(),
      });
    }

    const department = departmentMap.get(departmentId);

    if (!department.items.has(departmentItemId)) {
      department.items.set(departmentItemId, {
        department_item_id: row.department_item_id,
        department_category_budget_id: row.department_category_budget_id,
        package_item_id: row.package_item_id,
        catalog_item_id: row.catalog_item_id,
        catalog_item_name: row.catalog_item_name,
        catalog_item_code: row.catalog_item_code,
        requested_quantity: toNumber(row.requested_quantity),
        approved_quantity: toNumber(row.category_approved_quantity),
        review_note: row.review_note || null,
        needs_reconciliation: Boolean(row.needs_reconciliation),
        cfo_review_status: row.cfo_review_status || null,
        cfo_review_note: row.cfo_review_note || null,
        row_version: row.department_item_row_version,
        package_item_row_version: row.package_item_row_version,
        allocations: [],
      });
    }

    const item = department.items.get(departmentItemId);

    if (row.allocation_id && toNumber(row.allocated_quantity) > 0) {
      item.allocations.push({
        id: row.allocation_id,
        category_budget_package_sub_item_id: row.package_sub_item_id,
        package_sub_item_id: row.package_sub_item_id,
        catalog_sub_item_id: row.catalog_sub_item_id,
        package_sub_item_name: row.package_sub_item_name,
        allocated_quantity: toNumber(row.allocated_quantity),
        unit_price: row.unit_price === null ? null : toNumber(row.unit_price),
        unit_of_measure_name: row.unit_of_measure_name || null,
        unit_of_measure_code: row.unit_of_measure_code || null,
        row_version: row.allocation_row_version,
      });
    }
  }

  const departments = Array.from(departmentMap.values()).map((department) => {
    const items = Array.from(department.items.values()).map((item) => {
      const allocatedQuantity = item.allocations.reduce(
        (sum, allocation) => sum + toNumber(allocation.allocated_quantity),
        0,
      );

      const remainingQuantity = diff(item.approved_quantity, allocatedQuantity);

      return {
        ...item,
        allocated_quantity: allocatedQuantity,
        remaining_quantity: remainingQuantity,
        reconciliation_status:
          remainingQuantity > 0
            ? RECONCILIATION_STATUS.SHORT
            : remainingQuantity < 0
              ? RECONCILIATION_STATUS.EXCESS
              : RECONCILIATION_STATUS.RECONCILED,
      };
    });

    const totals = items.reduce(
      (summary, item) => {
        summary.requested_quantity += item.requested_quantity;
        summary.approved_quantity += item.approved_quantity;
        summary.allocated_quantity += item.allocated_quantity;

        if (item.reconciliation_status !== RECONCILIATION_STATUS.RECONCILED) {
          summary.issue_count += 1;
        }

        return summary;
      },
      {
        requested_quantity: 0,
        approved_quantity: 0,
        allocated_quantity: 0,
        issue_count: 0,
      },
    );

    const remainingQuantity = diff(
      totals.approved_quantity,
      totals.allocated_quantity,
    );

    return {
      department_id: department.department_id,
      department_name: department.department_name,
      department_code: department.department_code,
      item_count: items.length,
      requested_quantity: totals.requested_quantity,
      approved_quantity: totals.approved_quantity,
      allocated_quantity: totals.allocated_quantity,
      remaining_quantity: remainingQuantity,
      issue_count: totals.issue_count,
      reconciliation_status:
        totals.issue_count === 0
          ? RECONCILIATION_STATUS.RECONCILED
          : items.some(
                (item) =>
                  item.reconciliation_status ===
                  RECONCILIATION_STATUS.NEEDS_RECONCILIATION,
              )
            ? RECONCILIATION_STATUS.NEEDS_RECONCILIATION
            : remainingQuantity < 0
              ? RECONCILIATION_STATUS.EXCESS
              : RECONCILIATION_STATUS.SHORT,
      items,
    };
  });

  const summary = departments.reduce(
    (result, department) => {
      result.item_count += department.item_count;
      result.requested_quantity += department.requested_quantity;
      result.approved_quantity += department.approved_quantity;
      result.allocated_quantity += department.allocated_quantity;
      result.issue_count += department.issue_count;
      return result;
    },
    {
      department_count: departments.length,
      item_count: 0,
      requested_quantity: 0,
      approved_quantity: 0,
      allocated_quantity: 0,
      issue_count: 0,
    },
  );

  summary.remaining_quantity = diff(
    summary.approved_quantity,
    summary.allocated_quantity,
  );

  return {
    summary,
    departments,
  };
}
