import multer from "multer";

import { ApiError } from "../utils/apiError.js";

const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;

export const packageSubItemAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
  },
}).single("file");

export function handleUploadError(err, req, res, next) {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError) {
    next(
      new ApiError(
        400,
        err.code === "LIMIT_FILE_SIZE"
          ? "Attachment file is too large"
          : "Attachment upload failed",
        err.code === "LIMIT_FILE_SIZE"
          ? "ATTACHMENT_FILE_TOO_LARGE"
          : "ATTACHMENT_UPLOAD_INVALID",
      ),
    );
    return;
  }

  next(err);
}
