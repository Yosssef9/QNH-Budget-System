import { getBudgetAccessByUserId } from "../modules/access-management/access.service.js";

export async function verifyBudgetAccess(req, res, next) {
  try {
    const access = await getBudgetAccessByUserId(req.user.userId);

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to Budget System",
      });
    }

    req.budgetAccess = access;
    next();
  } catch (error) {
    next(error);
  }
}
