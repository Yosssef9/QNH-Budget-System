import express from "express";

import {
  getTransferItems,
  getAvailableTransferTypes,
} from "../controllers/budgetItem.controller.js";

const router = express.Router();

router.get("/transfer-items", getTransferItems);
router.get("/available-transfer-types", getAvailableTransferTypes);
export default router;
