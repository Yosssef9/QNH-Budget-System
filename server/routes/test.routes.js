import express from "express";
import { calculateItemBalance } from "../services/budgetBalance.service.js";

const router = express.Router();

router.get("/balance/:id", async (req, res, next) => {
  try {
    const result = await calculateItemBalance(Number(req.params.id));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
