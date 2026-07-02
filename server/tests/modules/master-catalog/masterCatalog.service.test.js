import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/transaction.js", () => ({
  withTransaction: vi.fn(async (callback) => callback({ transaction: true })),
}));

vi.mock("../../../modules/master-catalog/masterCatalog.repository.js", () => ({
  countActiveGeneralSubItemsRepo: vi.fn(),
  createCatalogItemRepo: vi.fn(),
  createCategoryRepo: vi.fn(),
  createSubItemRepo: vi.fn(),
  findCatalogItemByCodeRepo: vi.fn(),
  findCatalogItemByIdRepo: vi.fn(),
  findCatalogItemByNameInCategoryRepo: vi.fn(),
  findCategoryByCodeRepo: vi.fn(),
  findCategoryByIdRepo: vi.fn(),
  findSubItemByCodeRepo: vi.fn(),
  findSubItemByIdRepo: vi.fn(),
  findSubItemByNameRepo: vi.fn(),
  findUnitByIdRepo: vi.fn(),
  getAllCatalogItemsRepo: vi.fn(),
  getCatalogItemUsageRepo: vi.fn(),
  getCatalogItemsByCategoryRepo: vi.fn(),
  getCategoriesRepo: vi.fn(),
  getCategoryUsageRepo: vi.fn(),
  getNextCatalogItemSortOrderRepo: vi.fn(),
  getSubItemsByCatalogItemRepo: vi.fn(),
  getUnitsRepo: vi.fn(),
  updateCatalogItemRepo: vi.fn(),
  updateCatalogItemStatusRepo: vi.fn(),
  updateCategoryRepo: vi.fn(),
  updateSubItemRepo: vi.fn(),
  updateSubItemStatusRepo: vi.fn(),
}));

import {
  countActiveGeneralSubItemsRepo,
  createCatalogItemRepo,
  createSubItemRepo,
  findCatalogItemByCodeRepo,
  findCatalogItemByIdRepo,
  findCatalogItemByNameInCategoryRepo,
  findCategoryByIdRepo,
  findSubItemByCodeRepo,
  findSubItemByIdRepo,
  findSubItemByNameRepo,
  findUnitByIdRepo,
  getCatalogItemsByCategoryRepo,
  getCategoriesRepo,
  getNextCatalogItemSortOrderRepo,
  updateCatalogItemRepo,
  updateSubItemStatusRepo,
} from "../../../modules/master-catalog/masterCatalog.repository.js";
import {
  createCatalogItemService,
  createSubItemService,
  getCategoriesService,
  getCatalogItemsByCategoryService,
  updateCatalogItemService,
  updateSubItemStatusService,
} from "../../../modules/master-catalog/masterCatalog.service.js";

const departmentWorkspace = {
  department: { id: 10 },
  permissions: {},
};

const categoryWorkspace = {
  budgetCategory: { id: 1 },
  permissions: {},
};

const catalogAdminWorkspace = {
  permissions: { can_manage_budget_catalog: true },
};

const unrelatedGlobalWorkspace = {
  permissions: {},
};

describe("master catalog service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a catalog item and its default General sub-item transactionally", async () => {
    findCategoryByIdRepo.mockResolvedValue({
      id: 1,
      category_code: "IT",
      name: "IT",
      is_active: true,
    });
    findUnitByIdRepo.mockResolvedValue({
      id: 2,
      unit_code: "EA",
      name: "Each",
      is_active: true,
    });
    findCatalogItemByNameInCategoryRepo.mockResolvedValue(null);
    findCatalogItemByCodeRepo.mockResolvedValue(null);
    getNextCatalogItemSortOrderRepo.mockResolvedValue(4);
    createCatalogItemRepo.mockResolvedValue({ id: 10 });
    createSubItemRepo.mockResolvedValue({ id: 99 });
    findCatalogItemByIdRepo.mockResolvedValue({
      id: 10,
      budget_category_id: 1,
      category_name: "IT",
      category_code: "IT",
      item_code: "LAPTOP",
      name: "Laptop",
      expense_type: "CAPEX",
      unit_of_measure_id: 2,
      unit_name: "Each",
      unit_code: "EA",
      sort_order: 4,
      is_active: true,
      general_sub_item_id: 99,
    });

    const result = await createCatalogItemService({
      categoryId: 1,
      actorUserId: 7,
      payload: {
        item_code: "LAPTOP",
        name: "Laptop",
        expense_type: "CAPEX",
        unit_of_measure_id: 2,
      },
    });

    expect(createCatalogItemRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        budget_category_id: 1,
        item_code: "LAPTOP",
        sort_order: 4,
      }),
    );
    expect(createSubItemRepo).toHaveBeenCalledWith(
      { transaction: true },
      expect.objectContaining({
        catalog_item_id: 10,
        sub_item_code: "GENERAL",
        name: "General",
        is_default_general: true,
      }),
    );
    expect(result.general_sub_item_id).toBe(99);
  });

  it("rejects duplicate catalog item names within the same category", async () => {
    findCategoryByIdRepo.mockResolvedValue({ id: 1, is_active: true });
    findUnitByIdRepo.mockResolvedValue({ id: 2, is_active: true });
    findCatalogItemByNameInCategoryRepo.mockResolvedValue({ id: 5 });

    await expect(
      createCatalogItemService({
        categoryId: 1,
        payload: {
          item_code: "LAPTOP",
          name: "Laptop",
          expense_type: "CAPEX",
          unit_of_measure_id: 2,
        },
      }),
    ).rejects.toThrow("A catalog item with this name already exists");
  });

  it("rejects catalog item creation when unit of measure is missing", async () => {
    findCategoryByIdRepo.mockResolvedValue({ id: 1, is_active: true });

    await expect(
      createCatalogItemService({
        categoryId: 1,
        payload: {
          item_code: "LAPTOP",
          name: "Laptop",
          expense_type: "CAPEX",
        },
      }),
    ).rejects.toThrow("Unit of measure is required");
  });

  it("rejects catalog item creation when unit of measure is invalid or inactive", async () => {
    findCategoryByIdRepo.mockResolvedValue({ id: 1, is_active: true });
    findUnitByIdRepo.mockResolvedValue(null);

    await expect(
      createCatalogItemService({
        categoryId: 1,
        payload: {
          item_code: "LAPTOP",
          name: "Laptop",
          expense_type: "CAPEX",
          unit_of_measure_id: 999,
        },
      }),
    ).rejects.toThrow("Unit of measure not found");
  });

  it("updates a catalog item's unit of measure", async () => {
    findCatalogItemByIdRepo
      .mockResolvedValueOnce({
        id: 10,
        budget_category_id: 1,
        item_code: "LAPTOP",
        name: "Laptop",
        expense_type: "CAPEX",
        unit_of_measure_id: 2,
        is_active: true,
      })
      .mockResolvedValueOnce({
        id: 10,
        budget_category_id: 1,
        category_name: "IT",
        category_code: "IT",
        item_code: "LAPTOP",
        name: "Laptop",
        expense_type: "CAPEX",
        unit_of_measure_id: 3,
        unit_name: "Box",
        unit_code: "BOX",
        is_active: true,
      });
    findUnitByIdRepo.mockResolvedValue({ id: 3, is_active: true });
    findCatalogItemByNameInCategoryRepo.mockResolvedValue(null);
    findCatalogItemByCodeRepo.mockResolvedValue(null);
    updateCatalogItemRepo.mockResolvedValue({ id: 10 });

    const result = await updateCatalogItemService({
      id: 10,
      actorUserId: 7,
      payload: {
        item_code: "LAPTOP",
        name: "Laptop",
        expense_type: "CAPEX",
        unit_of_measure_id: 3,
      },
    });

    expect(updateCatalogItemRepo).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ unit_of_measure_id: 3 }),
    );
    expect(result.unit_of_measure_id).toBe(3);
    expect(result.unit_name).toBe("Box");
  });

  it("allows a department workspace to read all active categories", async () => {
    getCategoriesRepo.mockResolvedValue([
      { id: 1, name: "IT", category_code: "IT", is_active: true },
      {
        id: 2,
        name: "Biomedical",
        category_code: "BIOMEDICAL",
        is_active: true,
      },
      { id: 3, name: "General", category_code: "GENERAL", is_active: true },
    ]);

    const result = await getCategoriesService(departmentWorkspace);

    expect(result).toHaveLength(3);
  });

  it("allows a department workspace to read catalog items for any category", async () => {
    findCategoryByIdRepo.mockResolvedValue({ id: 1, is_active: true });
    getCatalogItemsByCategoryRepo.mockResolvedValue([
      {
        id: 10,
        budget_category_id: 1,
        category_name: "IT",
        category_code: "IT",
        item_code: "LAPTOP",
        name: "Laptop",
        expense_type: "CAPEX",
        unit_of_measure_id: 2,
        unit_name: "Each",
        unit_code: "EA",
        is_active: true,
      },
    ]);

    const result = await getCatalogItemsByCategoryService(
      1,
      departmentWorkspace,
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        unit_of_measure_id: 2,
        unit_name: "Each",
        unit_code: "EA",
      }),
    );
  });

  it("allows a category workspace to read only its assigned category", async () => {
    getCategoriesRepo.mockResolvedValue([
      { id: 1, name: "IT", category_code: "IT", is_active: true },
      {
        id: 2,
        name: "Biomedical",
        category_code: "BIOMEDICAL",
        is_active: true,
      },
    ]);
    findCategoryByIdRepo.mockResolvedValue({ id: 1, is_active: true });
    getCatalogItemsByCategoryRepo.mockResolvedValue([]);

    const categories = await getCategoriesService(categoryWorkspace);
    await getCatalogItemsByCategoryService(1, categoryWorkspace);

    expect(categories).toEqual([
      expect.objectContaining({ id: 1, category_code: "IT" }),
    ]);
    expect(getCatalogItemsByCategoryRepo).toHaveBeenCalledWith(1);
  });

  it("denies a category workspace from reading another category", async () => {
    await expect(
      getCatalogItemsByCategoryService(2, categoryWorkspace),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "MASTER_CATALOG_LOOKUP_FORBIDDEN",
    });

    expect(findCategoryByIdRepo).not.toHaveBeenCalled();
    expect(getCatalogItemsByCategoryRepo).not.toHaveBeenCalled();
  });

  it("allows a catalog administrator to read all active categories", async () => {
    getCategoriesRepo.mockResolvedValue([
      { id: 1, name: "IT", category_code: "IT", is_active: true },
      {
        id: 2,
        name: "Biomedical",
        category_code: "BIOMEDICAL",
        is_active: true,
      },
    ]);

    const result = await getCategoriesService(catalogAdminWorkspace);

    expect(result).toHaveLength(2);
  });

  it("denies operational lookup for unrelated global workspaces", async () => {
    await expect(
      getCategoriesService(unrelatedGlobalWorkspace),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "MASTER_CATALOG_LOOKUP_FORBIDDEN",
    });

    expect(getCategoriesRepo).not.toHaveBeenCalled();
  });

  it("rejects a second active General sub-item", async () => {
    findCatalogItemByIdRepo.mockResolvedValue({ id: 10, is_active: true });
    findUnitByIdRepo.mockResolvedValue({ id: 2, is_active: true });
    findSubItemByCodeRepo.mockResolvedValue(null);
    findSubItemByNameRepo.mockResolvedValue(null);
    countActiveGeneralSubItemsRepo.mockResolvedValue(1);

    await expect(
      createSubItemService({
        catalogItemId: 10,
        payload: {
          sub_item_code: "GENERAL",
          name: "General",
          default_unit_of_measure_id: 2,
          is_default_general: true,
        },
      }),
    ).rejects.toThrow("already has an active General sub-item");
  });

  it("blocks deactivating the default General sub-item", async () => {
    findSubItemByIdRepo.mockResolvedValue({
      id: 99,
      catalog_item_id: 10,
      name: "General",
      is_default_general: true,
      is_active: true,
    });

    await expect(
      updateSubItemStatusService({
        id: 99,
        isActive: false,
        actorUserId: 7,
      }),
    ).rejects.toThrow("default General sub-item cannot be deactivated");
    expect(updateSubItemStatusRepo).not.toHaveBeenCalled();
  });
});
