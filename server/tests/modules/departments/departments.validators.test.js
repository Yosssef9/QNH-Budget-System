import { describe, expect, it } from "vitest";
import {
  validateCreateDepartment,
  validateDepartmentId,
  validateDepartmentListQuery,
  validateUpdateDepartmentDescription,
  validateUpdateDepartmentStatus,
} from "../../../modules/departments/departments.validators.js";

describe("department validators", () => {
  it("normalizes a valid department creation payload", () => {
    expect(
      validateCreateDepartment({
        name: "  Clinical   Engineering ",
        department_code: "clinical_engineering",
        description: "  Maintains clinical equipment  ",
      }),
    ).toEqual({
      name: "Clinical Engineering",
      department_code: "CLINICAL_ENGINEERING",
      description: "Maintains clinical equipment",
      is_active: true,
    });
  });

  it("generates a department code when it is not supplied", () => {
    expect(
      validateCreateDepartment({
        name: "Women's Health & Maternity",
        department_code: "",
      }),
    ).toEqual({
      name: "Women's Health & Maternity",
      department_code: "WOMEN_S_HEALTH_MATERNITY",
      description: null,
      is_active: true,
    });
  });

  it("requires an explicit code when the name cannot generate one", () => {
    expect(() =>
      validateCreateDepartment({
        name: "قسم المختبر",
      }),
    ).toThrow("Enter a department code because this name cannot generate one");
  });

  it("rejects invalid department codes", () => {
    expect(() =>
      validateCreateDepartment({
        name: "Clinical Engineering",
        department_code: "CLINICAL ENGINEERING",
      }),
    ).toThrow("Department code may contain only");
  });

  it("validates list filters and mutation payloads", () => {
    expect(validateDepartmentListQuery({ status: "inactive" })).toEqual({
      status: "INACTIVE",
      search: null,
    });
    expect(validateUpdateDepartmentDescription({ description: "  Updated " }))
      .toEqual({ description: "Updated" });
    expect(validateUpdateDepartmentStatus({ is_active: false })).toEqual({
      is_active: false,
    });
    expect(validateDepartmentId("12")).toBe(12);
  });

  it("rejects malformed ids, filters, and statuses", () => {
    expect(() => validateDepartmentId("0")).toThrow(
      "Department id must be a positive integer",
    );
    expect(() => validateDepartmentListQuery({ status: "DELETED" })).toThrow(
      "Department status filter must be ALL, ACTIVE, or INACTIVE",
    );
    expect(() => validateUpdateDepartmentStatus({ is_active: 1 })).toThrow(
      "is_active must be true or false",
    );
  });
});
