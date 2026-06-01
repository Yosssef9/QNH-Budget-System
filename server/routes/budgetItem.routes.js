import express from "express";

import {
  getTransferItems,
} from "../controllers/budgetItem.controller.js";

const router = express.Router();

router.get(
  "/transfer-items",
  getTransferItems
);

export default router;