import {
  getTransferItemsService,
  getAvailableTransferTypesService,
} from "../services/budgetItem.service.js";

import { ApiResponse } from "../utils/apiResponse.js";
export async function getTransferItems(req, res, next) {
  try {
    const result = await getTransferItemsService(req.query.financialYearId);

    return res.json(
      new ApiResponse({
        message: "Transfer items fetched successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}
export async function getAvailableTransferTypes(req, res, next) {
  try {
    const departmentId = req.budgetAccess?.department?.id;

    const result = await getAvailableTransferTypesService(departmentId);

    return res.json(
      new ApiResponse({
        message: "Available transfer types fetched successfully",
        data: result,
      }),
    );
  } catch (err) {
    next(err);
  }
}
