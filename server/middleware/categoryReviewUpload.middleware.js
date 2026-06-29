import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(
        new ApiError(
          400,
          "Unsupported attachment type. Allowed files: PDF, Word, Excel, JPG, PNG",
          "UNSUPPORTED_ATTACHMENT_TYPE",
        ),
      );
    }

    return callback(null, true);
  },
});

export function uploadCategoryReviewAttachment(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      if (!req.file) {
        return next(
          new ApiError(400, "Attachment file is required", "FILE_REQUIRED"),
        );
      }

      return next();
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(
        new ApiError(
          400,
          "Attachment file size must not exceed 5 MB",
          "ATTACHMENT_TOO_LARGE",
        ),
      );
    }

    return next(error);
  });
}
