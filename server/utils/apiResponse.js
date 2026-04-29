export class ApiResponse {
  constructor({ success = true, message = "", data = null }) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}