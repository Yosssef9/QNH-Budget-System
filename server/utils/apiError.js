export class ApiError extends Error {
  constructor(statusCode, message, errorCode = null, details = null) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode; // e.g. "PERMISSION_DENIED"
    this.details = details;     // extra info (validation errors, etc.)
    this.success = false;
  }
}