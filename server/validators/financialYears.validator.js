import { ApiError } from "../utils/apiError.js";

export function validateStartFinancialYear(body) {
  const { year } = body;

  // Required
  if (!year) {
    throw new ApiError(
      400,
      "Year is required",
      "VALIDATION_ERROR"
    );
  }

  // Must be number
  if (typeof year !== "number") {
    throw new ApiError(
      400,
      "Year must be a number",
      "VALIDATION_ERROR"
    );
  }

  // Integer check
  if (!Number.isInteger(year)) {
    throw new ApiError(
      400,
      "Year must be an integer",
      "VALIDATION_ERROR"
    );
  }

  // Range validation
  if (year < 2000 || year > 2100) {
    throw new ApiError(
      400,
      "Year must be between 2000 and 2100",
      "VALIDATION_ERROR"
    );
  }
}