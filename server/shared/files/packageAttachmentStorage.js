import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import crypto from "crypto";

const DEFAULT_STORAGE_ROOT = path.resolve(
  process.cwd(),
  "storage",
  "category-package-attachments",
);

function getStorageRoot() {
  return path.resolve(
    process.env.BUDGET_ATTACHMENT_STORAGE_ROOT || DEFAULT_STORAGE_ROOT,
  );
}

function sanitizeExtension(originalName = "") {
  const extension = path.extname(originalName).toLowerCase();
  return /^[a-z0-9.]{1,12}$/.test(extension) ? extension : "";
}

function resolveStoragePath(storageKey) {
  const root = getStorageRoot();
  const target = path.resolve(root, storageKey);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid attachment storage key");
  }

  return target;
}

export async function savePackageAttachmentFile({ buffer, originalName }) {
  const root = getStorageRoot();
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const directory = path.join(root, year, month);
  const storageKey = path.join(
    year,
    month,
    `${crypto.randomUUID()}${sanitizeExtension(originalName)}`,
  );
  const targetPath = resolveStoragePath(storageKey);

  await fsPromises.mkdir(directory, { recursive: true });
  await fsPromises.writeFile(targetPath, buffer, { flag: "wx" });

  return storageKey.replaceAll(path.sep, "/");
}

export function createPackageAttachmentReadStream(storageKey) {
  return fs.createReadStream(resolveStoragePath(storageKey));
}

export async function removePackageAttachmentFile(storageKey) {
  try {
    await fsPromises.unlink(resolveStoragePath(storageKey));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
