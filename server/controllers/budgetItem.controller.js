import {
  getTransferItemsService,
} from "../services/budgetItem.service.js";

export async function getTransferItems(
  req,
  res,
  next
) {
  try {

    const result =
      await getTransferItemsService(
        req.query.financialYearId
      );

    res.json(result);

  } catch (err) {
    next(err);
  }
}