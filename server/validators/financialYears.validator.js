import { ApiError } from "../utils/apiError.js";

function toYear(value) {
  const year = Number(value);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ApiError(
      400,
      "Year must be an integer between 2000 and 2100",
      "VALIDATION_ERROR",
    );
  }

  return year;
}

export function validateCreateFinancialYear(body = {}) {
  if (body.year === undefined || body.year === null || body.year === "") {
    throw new ApiError(400, "Year is required", "VALIDATION_ERROR");
  }

  return {
    year: toYear(body.year),
  };
}

export function validateFinancialYearId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(
      400,
      "Financial year id must be a positive integer",
      "VALIDATION_ERROR",
    );
  }

  return id;
}
