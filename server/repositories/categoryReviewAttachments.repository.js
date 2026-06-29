import { poolPromise, sql } from "../config/db.js";
import { createRequest } from "../utils/createRequest.js";

export async function getReviewAttachmentsRepo(reviewId, transaction = null) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .query(`
      SELECT
        a.id,
        a.category_type_review_id,
        a.original_file_name,
        a.storage_key,
        a.mime_type,
        a.file_size_bytes,
        a.description,
        a.uploaded_by,
        a.uploaded_at
      FROM dbo.BS_category_type_review_attachments a
      WHERE a.category_type_review_id = @reviewId
        AND a.is_active = 1
      ORDER BY a.uploaded_at DESC, a.id DESC
    `);

  return result.recordset || [];
}

export async function createReviewAttachmentRepo({
  reviewId,
  originalFileName,
  storageKey,
  mimeType,
  fileSizeBytes,
  description,
  uploadedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .input("originalFileName", sql.NVarChar(300), originalFileName)
    .input("storageKey", sql.NVarChar(500), storageKey)
    .input("mimeType", sql.NVarChar(150), mimeType)
    .input("fileSizeBytes", sql.BigInt, fileSizeBytes)
    .input("description", sql.NVarChar(500), description)
    .input("uploadedBy", sql.Int, uploadedBy)
    .query(`
      INSERT INTO dbo.BS_category_type_review_attachments (
        category_type_review_id,
        original_file_name,
        storage_key,
        mime_type,
        file_size_bytes,
        description,
        uploaded_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @reviewId,
        @originalFileName,
        @storageKey,
        @mimeType,
        @fileSizeBytes,
        @description,
        @uploadedBy
      )
    `);

  return result.recordset[0] || null;
}

export async function getReviewAttachmentByIdRepo({
  reviewId,
  attachmentId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .input("attachmentId", sql.BigInt, attachmentId)
    .query(`
      SELECT TOP 1
        a.*
      FROM dbo.BS_category_type_review_attachments a
      WHERE a.id = @attachmentId
        AND a.category_type_review_id = @reviewId
        AND a.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function deactivateReviewAttachmentRepo({
  reviewId,
  attachmentId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("reviewId", sql.BigInt, reviewId)
    .input("attachmentId", sql.BigInt, attachmentId)
    .query(`
      UPDATE dbo.BS_category_type_review_attachments
      SET is_active = 0
      OUTPUT INSERTED.*
      WHERE id = @attachmentId
        AND category_type_review_id = @reviewId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function getReviewSubItemAttachmentsRepo(
  lineId,
  transaction = null,
) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .query(`
      SELECT
        a.id,
        a.category_type_review_sub_item_id,
        a.original_file_name,
        a.storage_key,
        a.mime_type,
        a.file_size_bytes,
        a.description,
        a.uploaded_by,
        a.uploaded_at
      FROM dbo.BS_category_type_review_sub_item_attachments a
      WHERE a.category_type_review_sub_item_id = @lineId
        AND a.is_active = 1
      ORDER BY a.uploaded_at DESC, a.id DESC
    `);

  return result.recordset || [];
}

export async function createReviewSubItemAttachmentRepo({
  lineId,
  originalFileName,
  storageKey,
  mimeType,
  fileSizeBytes,
  description,
  uploadedBy,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .input("originalFileName", sql.NVarChar(300), originalFileName)
    .input("storageKey", sql.NVarChar(500), storageKey)
    .input("mimeType", sql.NVarChar(150), mimeType)
    .input("fileSizeBytes", sql.BigInt, fileSizeBytes)
    .input("description", sql.NVarChar(500), description)
    .input("uploadedBy", sql.Int, uploadedBy)
    .query(`
      INSERT INTO dbo.BS_category_type_review_sub_item_attachments (
        category_type_review_sub_item_id,
        original_file_name,
        storage_key,
        mime_type,
        file_size_bytes,
        description,
        uploaded_by
      )
      OUTPUT INSERTED.*
      VALUES (
        @lineId,
        @originalFileName,
        @storageKey,
        @mimeType,
        @fileSizeBytes,
        @description,
        @uploadedBy
      )
    `);

  return result.recordset[0] || null;
}

export async function getReviewSubItemAttachmentByIdRepo({
  lineId,
  attachmentId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .input("attachmentId", sql.BigInt, attachmentId)
    .query(`
      SELECT TOP 1
        a.*
      FROM dbo.BS_category_type_review_sub_item_attachments a
      WHERE a.id = @attachmentId
        AND a.category_type_review_sub_item_id = @lineId
        AND a.is_active = 1
    `);

  return result.recordset[0] || null;
}

export async function deactivateReviewSubItemAttachmentRepo({
  lineId,
  attachmentId,
  transaction = null,
}) {
  const pool = await poolPromise;

  const result = await createRequest(pool, transaction)
    .input("lineId", sql.BigInt, lineId)
    .input("attachmentId", sql.BigInt, attachmentId)
    .query(`
      UPDATE dbo.BS_category_type_review_sub_item_attachments
      SET is_active = 0
      OUTPUT INSERTED.*
      WHERE id = @attachmentId
        AND category_type_review_sub_item_id = @lineId
        AND is_active = 1
    `);

  return result.recordset[0] || null;
}
