import express from "express";

import {
  createTransfer,
  getTransfers,
  approveTransfer,
  rejectTransfer,
  getPendingTransfers,
  getTransferById
} from "../controllers/transfer.controller.js";

const router = express.Router();
router.get("/", getTransfers);

router.get("/pending", getPendingTransfers);

router.get("/:id", getTransferById);

router.post("/", createTransfer);

router.post("/:id/approve", approveTransfer);

router.post("/:id/reject", rejectTransfer);
export default router;
