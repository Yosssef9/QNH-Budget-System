import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { poolPromise, sql } from "../../config/db.js";
import { getPackageAttachmentStorageRoot } from "../../shared/files/packageAttachmentStorage.js";
import { sanitizeErrorMessage } from "./systemHealth.mapper.js";

const STORAGE_SAMPLE_LIMIT = 250;

function resolveStorageKey(storageKey) {
  const root = getPackageAttachmentStorageRoot();
  const target = path.resolve(root, storageKey || "");
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid attachment storage key");
  }

  return target;
}

export async function getAttachmentStorageRowsRepo() {
  const pool = await poolPromise;

  const [summaryResult, sampleResult] = await Promise.all([
    pool.request().query(`
      SELECT
        COUNT(1) AS active_attachment_count,
        COALESCE(SUM(file_size_bytes), 0) AS active_attachment_bytes
      FROM dbo.BS_category_budget_package_sub_item_attachments
      WHERE is_active = 1;
    `),
    pool.request().input("limit", sql.Int, STORAGE_SAMPLE_LIMIT).query(`
      SELECT TOP (@limit)
        id,
        category_budget_package_sub_item_id,
        original_file_name,
        storage_key,
        file_size_bytes,
        uploaded_at
      FROM dbo.BS_category_budget_package_sub_item_attachments
      WHERE is_active = 1
      ORDER BY uploaded_at DESC, id DESC;
    `),
  ]);

  return {
    summary: summaryResult.recordset?.[0] || {},
    sample: sampleResult.recordset || [],
    sampleLimit: STORAGE_SAMPLE_LIMIT,
  };
}

export async function checkPackageAttachmentStorageRepo() {
  const root = getPackageAttachmentStorageRoot();
  const markerName = `.system-health-${crypto.randomUUID()}.tmp`;
  const markerPath = path.join(root, markerName);
  const result = {
    configuredByEnv: Boolean(process.env.BUDGET_ATTACHMENT_STORAGE_ROOT),
    rootExists: false,
    readable: false,
    writable: false,
    removable: false,
    error: null,
  };

  try {
    await fs.mkdir(root, { recursive: true });
    result.rootExists = true;

    await fs.access(root);
    result.readable = true;

    await fs.writeFile(markerPath, "system-health", { flag: "wx" });
    result.writable = true;

    await fs.unlink(markerPath);
    result.removable = true;
  } catch (error) {
    result.error = sanitizeErrorMessage(error?.message);

    try {
      await fs.unlink(markerPath);
    } catch {
      // Best-effort cleanup only.
    }
  }

  return result;
}

export async function checkMissingAttachmentFilesRepo(rows = []) {
  const missing = [];
  const invalid = [];

  for (const row of rows) {
    try {
      await fs.access(resolveStorageKey(row.storage_key));
    } catch (error) {
      if (error?.message === "Invalid attachment storage key") {
        invalid.push({
          id: row.id,
          originalFileName: row.original_file_name,
          reason: "Invalid storage key",
        });
      } else {
        missing.push({
          id: row.id,
          originalFileName: row.original_file_name,
          uploadedAt: row.uploaded_at,
        });
      }
    }
  }

  return { missing, invalid };
}
