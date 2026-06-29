import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");
const uploadRoot = path.join(serverRoot, "uploads", "category-review-attachments");

function getSafeExtension(fileName) {
  const extension = path.extname(String(fileName || "")).toLowerCase();

  if (!extension || extension.length > 12) return "";

  return extension.replace(/[^a-z0-9.]/g, "");
}

export async function saveCategoryReviewAttachmentFile(file) {
  await fs.mkdir(uploadRoot, { recursive: true });

  const storageKey = `${crypto.randomUUID()}${getSafeExtension(file.originalname)}`;
  const absolutePath = path.join(uploadRoot, storageKey);

  await fs.writeFile(absolutePath, file.buffer);

  return {
    storageKey,
    absolutePath,
  };
}

export function getCategoryReviewAttachmentPath(storageKey) {
  const safeStorageKey = path.basename(String(storageKey || ""));
  return path.join(uploadRoot, safeStorageKey);
}

export async function deleteCategoryReviewAttachmentFile(storageKey) {
  if (!storageKey) return;

  const absolutePath = getCategoryReviewAttachmentPath(storageKey);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
